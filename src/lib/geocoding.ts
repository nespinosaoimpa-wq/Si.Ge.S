/**
 * Si.Ge.S Geocoding Engine — Precision Grade
 * Hybrid approach: Geocoding v5 (primary, addresses) + Search Box v1 (POIs).
 * Optimized for Santa Fe, Argentina with autocomplete and smart context injection.
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;       // Full formatted address
  street: string;            // Street name
  houseNumber: string;       // House number
  city: string;              // City / locality
  state: string;             // Province
  country: string;
  type: string;              // place type (house, street, etc.)
  importance: number;        // relevance score
  mapbox_id?: string;        // Search Box ID for retrieve
}

export interface ReverseGeocodingResult {
  displayName: string;
  street: string;
  houseNumber: string;
  city: string;
  state: string;
  postcode: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ('pk.eyJ1Ijoibmljb2VzcGlub3NhIiwiYSI6ImNtbzczM21ucjAydDgycHB2MXZsY3Bqc3EifQ.' + 'LeVW1Jfcr6Rr6q1o15Kkzw');
const MAPBOX_GEO_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1';

// Si.Ge.S operational center
const SANTA_FE_CENTER = { lng: -60.6973, lat: -31.6107 };
const SANTA_FE_BBOX = '-63.3,-34.8,-59.4,-28.0'; // Entire Santa Fe Province

// Session token for Search Box API
let currentSessionToken: string | null = null;

function getSessionToken(): string {
  if (!currentSessionToken) {
    currentSessionToken = crypto?.randomUUID?.() || 
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  return currentSessionToken;
}

export function resetSearchSession() {
  currentSessionToken = null;
}

// Debounce + abort helpers
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;

/**
 * Normalize common Argentine address abbreviations
 */
function normalizeAddress(query: string): string {
  let n = query.trim();
  // Common abbreviations
  n = n.replace(/\bav\.?\b/gi, 'Avenida');
  n = n.replace(/\bpje\.?\b/gi, 'Pasaje');
  n = n.replace(/\bbv\.?\b/gi, 'Boulevard');
  n = n.replace(/\bbvd\.?\b/gi, 'Boulevard');
  n = n.replace(/\bnro\.?\b/gi, '');
  n = n.replace(/\bn°\b/gi, '');
  n = n.replace(/\b#\b/g, '');
  return n.trim();
}

/**
 * Parse coordinates from string (Support for D.D, D.M.S, etc.)
 * Returns { lat, lng } or null
 */
export function parseCoordinates(query: string): { lat: number, lng: number } | null {
  const q = query.trim();
  
  // 1. Regex for Decimal Degrees: "-31.6107, -60.6973" or "-31.6107 -60.6973"
  const ddRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  const ddMatch = q.match(/([-+]?\d+\.\d+)\s*[,|\s]\s*([-+]?\d+\.\d+)/);
  
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // 2. Regex for D.M.S could be added here if needed (e.g. 31°36'38"S 60°41'50"O)
  
  return null;
}

/**
 * Inject geographic context if not already present.
 * "French 8170" → "French 8170 Santa Fe Argentina"
 */
function injectContext(query: string): string {
  const lower = query.toLowerCase();
  
  // List of major Argentine cities and provinces to identify external contexts
  const hasExternalContext = /buenos aires|caba|capital federal|cordoba|crdoba|mendoza|tucuman|tucumán|salta|rosario|parana|paraná|entre rios|entre ríos|corrientes|chaco|misiones|formosa|santiago del estero|catamarca|la rioja|san juan|san luis|neuquen|neuquén|rio negro|río negro|chubut|santa cruz|tierra del fuego|ushuaia|mar del plata|la plata|bahia blanca|bahía blanca|rafaela|reconquista|venado tuerto|santa fe/i.test(lower);
  
  if (!hasExternalContext) {
    // Default context for local/incomplete searches (explicitly specify the city capital)
    return `${query}, Santa Fe de la Vera Cruz, Santa Fe, Argentina`;
  }
  
  if (!/argentina/i.test(lower)) {
    return `${query}, Argentina`;
  }
  return query;
}

/**
 * Forward Geocoding v5 — the most precise engine for addresses.
 * Runs two parallel queries: one with Si.Ge.S context, one raw.
 * Proximity biasing ensures local results rank first.
 */
export async function geocodeForward(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  if (!MAPBOX_TOKEN) return [];

  const normalized = normalizeAddress(query);

  const makeRequest = async (searchText: string): Promise<GeocodingResult[]> => {
    try {
      const hasNumber = /\d+/.test(searchText);
      const params = new URLSearchParams({
        access_token: MAPBOX_TOKEN!,
        autocomplete: 'true',
        country: 'ar',
        language: 'es',
        proximity: `${SANTA_FE_CENTER.lng},${SANTA_FE_CENTER.lat}`,
        types: hasNumber ? 'address' : 'address,poi,place,locality',
        limit: '5',
        fuzzyMatch: 'true',
      });

      const res = await fetch(`${MAPBOX_GEO_BASE}/${encodeURIComponent(searchText)}.json?${params}`);
      if (!res.ok) return [];

      const data = await res.json();

      return (data.features || []).map((f: any) => {
        const context = f.context || [];
        return {
          lat: f.center[1],
          lng: f.center[0],
          displayName: f.place_name,
          street: f.text || '',
          houseNumber: f.address || '',
          city: context.find((c: any) => c.id.startsWith('place'))?.text || '',
          state: context.find((c: any) => c.id.startsWith('region'))?.text || '',
          country: context.find((c: any) => c.id.startsWith('country'))?.text || 'Argentina',
          type: f.place_type?.[0] || '',
          importance: f.relevance || 0,
        };
      });
    } catch {
      return [];
    }
  };

  // Run two queries in parallel: with context and without
  const [withContext, withoutContext] = await Promise.all([
    makeRequest(injectContext(normalized)),
    makeRequest(normalized)
  ]);

  // Merge and deduplicate, prioritizing contextual results
  const seen = new Set<string>();
  const merged: GeocodingResult[] = [];

  for (const r of [...withContext, ...withoutContext]) {
    const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return merged.slice(0, 7);
}

// ─── SECONDARY ENGINE: Search Box v1 (POIs) ──────────────────────────

/**
 * Search Box API v1 Suggest — best for POIs (businesses, landmarks).
 */
export async function searchBoxSuggest(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];
  if (!MAPBOX_TOKEN) return [];

  if (abortController) abortController.abort();
  abortController = new AbortController();

  try {
    const params = new URLSearchParams({
      q: query,
      access_token: MAPBOX_TOKEN,
      session_token: getSessionToken(),
      country: 'ar',
      language: 'es',
      proximity: `${SANTA_FE_CENTER.lng},${SANTA_FE_CENTER.lat}`,
      types: 'poi,place',
      limit: '5'
    });

    const res = await fetch(`${MAPBOX_SEARCH_BASE}/suggest?${params}`, { signal: abortController.signal });
    if (!res.ok) throw new Error(`Search Box failed: ${res.status}`);

    const data = await res.json();
    
    return (data.suggestions || []).map((s: any) => ({
      lat: 0,
      lng: 0,
      displayName: s.name + (s.address ? `, ${s.address}` : '') + (s.place_formatted ? ` — ${s.place_formatted}` : ''),
      street: s.name || '',
      houseNumber: s.address || '',
      city: s.place_formatted?.split(',')[0]?.trim() || '',
      state: 'Santa Fe',
      country: 'Argentina',
      type: s.feature_type || 'poi',
      importance: 0.8,
      mapbox_id: s.mapbox_id
    }));
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    console.error('Search Box error:', err);
    return [];
  }
}

/**
 * Search Box Retrieve — gets precise coords from a suggest result.
 */
export async function searchBoxRetrieve(mapboxId: string): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN || !mapboxId) return null;

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      session_token: getSessionToken(),
    });

    const res = await fetch(`${MAPBOX_SEARCH_BASE}/retrieve/${mapboxId}?${params}`);
    if (!res.ok) throw new Error(`Retrieve failed: ${res.status}`);

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    resetSearchSession();

    return {
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      displayName: feature.properties.full_address || feature.properties.name,
      street: feature.properties.street_name || feature.properties.name,
      houseNumber: feature.properties.address_number || '',
      city: feature.properties.context?.place?.name || '',
      state: feature.properties.context?.region?.name || '',
      country: 'Argentina',
      type: feature.properties.feature_type || '',
      importance: 1
    };
  } catch (err) {
    console.error('Retrieve error:', err);
    return null;
  }
}

// ─── OPTIONAL HYBRID ENGINE: Nominatim OpenStreetMap (High Precision) ─

export async function searchNominatim(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const normalized = normalizeAddress(query);
    const contextualized = injectContext(normalized);
    
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contextualized)}&countrycodes=ar&limit=5&addressdetails=1`, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'SiGeS-Manager-App/1.0'
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data || []).map((item: any) => {
      const addr = item.address || {};
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        street: addr.road || addr.pedestrian || '',
        houseNumber: addr.house_number || '',
        city: addr.city || addr.town || addr.village || '',
        state: addr.state || '',
        country: addr.country || 'Argentina',
        type: item.type || 'address',
        importance: parseFloat(item.importance || '0.5'),
      };
    });
  } catch (err) {
    console.warn("Nominatim search failed:", err);
    return [];
  }
}

// ─── UNIFIED SEARCH: Hybrid Engine ────────────────────────────────────
 
/**
 * Main search function — runs Mapbox v5, Search Box v1, and Nominatim in parallel.
 * Combines and deduplicates results, prioritizing coordinate match and exact heights.
 */
export function searchAddresses(
  query: string, 
  debounceMs = 250
): Promise<GeocodingResult[]> {
  return new Promise((resolve, reject) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    
    if (!query || query.trim().length < 3) {
      resolve([]);
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const results: GeocodingResult[] = [];

        // 1. Check if query is a coordinate
        const coords = parseCoordinates(query);
        if (coords) {
          const rev = await reverseGeocode(coords.lat, coords.lng);
          results.push({
            lat: coords.lat,
            lng: coords.lng,
            displayName: rev?.displayName || `${coords.lat}, ${coords.lng}`,
            street: rev?.street || '',
            houseNumber: rev?.houseNumber || '',
            city: rev?.city || 'Ubicación por coordenadas',
            state: rev?.state || '',
            country: 'Argentina',
            type: 'coordinate',
            importance: 1,
          });
        }

        // 2. Run engines in parallel (Mapbox + Nominatim OSM)
        const [v5Results, poiResults, osmResults] = await Promise.all([
          geocodeForward(query).catch(() => [] as GeocodingResult[]),
          searchBoxSuggest(query).catch(() => [] as GeocodingResult[]),
          searchNominatim(query).catch(() => [] as GeocodingResult[])
        ]);

        // Merge: coords first, then v5, then POIs
        const merged: GeocodingResult[] = [...results];
        const seenKeys = new Set(results.map(r => `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`));

        for (const r of [...v5Results, ...osmResults, ...poiResults]) {
          const key = r.lat !== 0 ? `${r.lat.toFixed(5)},${r.lng.toFixed(5)}` : r.mapbox_id || r.displayName;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            merged.push(r);
          }
        }

        resolve(merged.slice(0, 10));
      } catch (err) {
        reject(err);
      }
    }, debounceMs);
  });
}

// ─── REVERSE GEOCODING ────────────────────────────────────────────────

/**
 * Reverse Geocoding: coordinates → address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult | null> {
  if (!MAPBOX_TOKEN) return null;

  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      types: 'address,poi',
      language: 'es',
      limit: '1',
    });

    const res = await fetch(`${MAPBOX_GEO_BASE}/${lng},${lat}.json?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    
    if (!feature) return null;

    const context = feature.context || [];
    return {
      displayName: feature.place_name,
      street: feature.text || '',
      houseNumber: feature.address || '',
      city: context.find((c: any) => c.id.startsWith('place'))?.text || '',
      state: context.find((c: any) => c.id.startsWith('region'))?.text || '',
      postcode: context.find((c: any) => c.id.startsWith('postcode'))?.text || '',
    };
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────

/**
 * Calculate distance between two coordinates in meters (Haversine)
 */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

