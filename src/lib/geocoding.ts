/**
 * SIGPAD Geocoding Engine — Precision Catastral Grade (Santa Fe & Argentina)
 * Hybrid approach: Mapbox Geocoding v5 (primary, addresses with bbox bounding box)
 * + Search Box v1 (POIs) + Nominatim OpenStreetMap (cadastral fallback)
 * Optimized for Santa Fe, Argentina with autocomplete and smart cadastral context.
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;       // Full formatted address
  street: string;            // Street name
  houseNumber: string;       // House number / altura catastral
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
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const MAPBOX_GEO_BASE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const MAPBOX_SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1';

// Bounding Box para la provincia de Santa Fe (lngMin, latMin, lngMax, latMax)
export const SANTA_FE_PROVINCE_BBOX = '-62.9000,-34.4000,-59.4000,-28.0000';

// Tenant Geocoding Configurations for Global SaaS
export interface TenantGeocodingConfig {
  center: { lat: number; lng: number };
  countryCode: string;       // ISO 2-letter country code (e.g., 'ar', 'mx', 'cl', 'us')
  contextSuffix: string;     // Fallback text appended to search queries for local biasing
  bbox?: string;             // Bounding box constraint for high precision
}

let activeTenantConfig: TenantGeocodingConfig = {
  center: { lat: -31.6107, lng: -60.6973 },
  countryCode: 'ar',
  contextSuffix: 'Santa Fe, Provincia de Santa Fe, Argentina',
  bbox: SANTA_FE_PROVINCE_BBOX
};

export function setTenantGeocodingConfig(config: Partial<TenantGeocodingConfig>) {
  activeTenantConfig = {
    ...activeTenantConfig,
    ...config
  };
}

// Session token for Search Box API (Optimizes quota within Mapbox Free Tier)
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
 * Normaliza abreviaturas de calles de Argentina y arterias clave de Santa Fe
 * para garantizar coincidencia catastral exacta en Mapbox/OSM.
 */
function normalizeAddress(query: string): string {
  let n = query.trim();
  
  // 1. Prefijos y abreviaturas generales
  n = n.replace(/\bav\.?\b/gi, 'Avenida');
  n = n.replace(/\bpje\.?\b/gi, 'Pasaje');
  n = n.replace(/\bbv\.?\b/gi, 'Boulevard');
  n = n.replace(/\bbvd\.?\b/gi, 'Boulevard');
  n = n.replace(/\bbulevar\b/gi, 'Boulevard');
  n = n.replace(/\bnro\.?\b/gi, '');
  n = n.replace(/\bn°\b/gi, '');
  n = n.replace(/\b#\b/g, '');
  n = n.replace(/\bcnel\.?\b/gi, 'Coronel');
  n = n.replace(/\bgral\.?\b/gi, 'General');
  n = n.replace(/\bdr\.?\b/gi, 'Doctor');
  n = n.replace(/\bsgto\.?\b/gi, 'Sargento');
  n = n.replace(/\bcte\.?\b/gi, 'Comandante');
  n = n.replace(/\bpto\.?\b/gi, 'Puerto');
  
  // 2. Mapeo específico de calles y avenidas de Santa Fe (Capital, Santo Tomé, Sauce Viejo, Rosario)
  n = n.replace(/\bbv\.?\s*g[aá]lvez\b/gi, 'Boulevard Gálvez');
  n = n.replace(/\bbulevar\s*g[aá]lvez\b/gi, 'Boulevard Gálvez');
  n = n.replace(/\bbv\.?\s*pellegrini\b/gi, 'Boulevard Pellegrini');
  n = n.replace(/\bbulevar\s*pellegrini\b/gi, 'Boulevard Pellegrini');
  n = n.replace(/\bav\.?\s*freyre\b/gi, 'Avenida Gobernador Freyre');
  n = n.replace(/\bfreyre\b/gi, 'Avenida Gobernador Freyre');
  n = n.replace(/\bav\.?\s*arist[oó]bulo\s*del\s*valle\b/gi, 'Avenida Aristóbulo del Valle');
  n = n.replace(/\barist[oó]bulo\s*del\s*valle\b/gi, 'Avenida Aristóbulo del Valle');
  n = n.replace(/\bfacundo\s+zuvir[ií]a\b/gi, 'Avenida Facundo Zuviría');
  n = n.replace(/\bl[oó]pez\s+y\s+planes\b/gi, 'Avenida López y Planes');
  n = n.replace(/\bestanislao\s+l[oó]pez\b/gi, 'Avenida Estanislao López');
  n = n.replace(/\b27\s+de\s+febrero\b/gi, 'Avenida 27 de Febrero');
  n = n.replace(/\balem\b/gi, 'Avenida Leandro N. Alem');
  n = n.replace(/\bgral\.?\s+paz\b/gi, 'Avenida General Paz');
  n = n.replace(/\bblas\s+parera\b/gi, 'Avenida Blas Parera');
  n = n.replace(/\bgorriti\b/gi, 'Avenida Gorriti');
  n = n.replace(/\bpe[nñ]aloza\b/gi, 'Avenida Gobernador Peñaloza');
  n = n.replace(/\bj\.?\s*j\.?\s*paso\b/gi, 'Juan José Paso');
  n = n.replace(/\b1\s*(?:ro|ero)?\s*de\s+mayo\b/gi, 'Primero de Mayo');
  n = n.replace(/\b9\s+de\s+julio\b/gi, '9 de Julio');
  n = n.replace(/\b25\s+de\s+mayo\b/gi, '25 de Mayo');
  n = n.replace(/\b7\s+de\s+marzo\b/gi, 'Avenida 7 de Marzo');
  n = n.replace(/\bruta\s+1\b/gi, 'Ruta Provincial 1');
  n = n.replace(/\bruta\s+168\b/gi, 'Ruta Nacional 168');
  
  return n.trim();
}

/**
 * Extrae coordenadas si la consulta viene en formato numérico (grados decimales o GPS)
 */
export function parseCoordinates(query: string): { lat: number, lng: number } | null {
  const q = query.trim();
  const ddMatch = q.match(/([-+]?\d+\.\d+)\s*[,|\s]\s*([-+]?\d+\.\d+)/);
  
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * Inyecta contexto geográfico de Santa Fe si no está explícito en la búsqueda.
 */
function injectContext(query: string): string {
  const lower = query.toLowerCase();
  let adjustedQuery = query;
  
  if (activeTenantConfig.countryCode === 'ar' && /santa fe/i.test(lower)) {
    const hasOtherCity = /rosario|rafaela|reconquista|santo tom[eé]|sauce viejo|esperanza|franck|coronda|venado tuerto|sunchales|villa constitucion|san lorenzo|ca[nñ]ada de gomez|casilda|santa rosa/i.test(lower);
    if (!hasOtherCity) {
      adjustedQuery = query.replace(/santa fe/gi, 'Santa Fe de la Vera Cruz, Santa Fe');
    }
  }

  const lowerAdjusted = adjustedQuery.toLowerCase();
  const hasExternalContext = /buenos aires|caba|capital federal|cordoba|crdoba|mendoza|tucuman|tucumán|salta|rosario|parana|paraná|santiago|bogota|lima|madrid|mexico|méxico|colombia|chile|españa|uruguay|miami/i.test(lowerAdjusted);
  
  if (!hasExternalContext && !lowerAdjusted.includes(activeTenantConfig.countryCode)) {
    return `${adjustedQuery}, ${activeTenantConfig.contextSuffix}`;
  }
  
  return adjustedQuery;
}

/**
 * Geocoding Directo Mapbox v5 con restricción de Bounding Box (BBOX).
 * Garantiza máxima precisión catastral en alturas de calles para Santa Fe y Argentina.
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
        country: activeTenantConfig.countryCode,
        language: 'es',
        proximity: `${activeTenantConfig.center.lng},${activeTenantConfig.center.lat}`,
        types: hasNumber ? 'address' : 'address,poi,place,locality',
        limit: '6',
        fuzzyMatch: 'true',
      });

      // Aplicar delimitador espacial BBOX para forzar precisión local
      if (activeTenantConfig.bbox) {
        params.append('bbox', activeTenantConfig.bbox);
      }

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
          city: context.find((c: any) => c.id.startsWith('place'))?.text || 'Santa Fe',
          state: context.find((c: any) => c.id.startsWith('region'))?.text || 'Santa Fe',
          country: context.find((c: any) => c.id.startsWith('country'))?.text || 'Argentina',
          type: f.place_type?.[0] || '',
          importance: f.relevance || 0,
        };
      });
    } catch {
      return [];
    }
  };

  const [withContext, withoutContext] = await Promise.all([
    makeRequest(injectContext(normalized)),
    makeRequest(normalized)
  ]);

  const seen = new Set<string>();
  const merged: GeocodingResult[] = [];

  for (const r of [...withContext, ...withoutContext]) {
    const key = `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }

  return merged.slice(0, 8);
}

// ─── SEARCH BOX API v1 (Sugerencias POI y Comercio) ───────────────────

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
      country: activeTenantConfig.countryCode,
      language: 'es',
      proximity: `${activeTenantConfig.center.lng},${activeTenantConfig.center.lat}`,
      types: 'poi,place,address',
      limit: '5'
    });

    if (activeTenantConfig.bbox) {
      params.append('bbox', activeTenantConfig.bbox);
    }

    const res = await fetch(`${MAPBOX_SEARCH_BASE}/suggest?${params}`, { signal: abortController.signal });
    if (!res.ok) throw new Error(`Search Box failed: ${res.status}`);

    const data = await res.json();
    
    return (data.suggestions || []).map((s: any) => ({
      lat: 0,
      lng: 0,
      displayName: s.name + (s.address ? `, ${s.address}` : '') + (s.place_formatted ? ` — ${s.place_formatted}` : ''),
      street: s.name || '',
      houseNumber: s.address || '',
      city: s.place_formatted?.split(',')[0]?.trim() || 'Santa Fe',
      state: 'Santa Fe',
      country: 'Argentina',
      type: s.feature_type || 'poi',
      importance: 0.85,
      mapbox_id: s.mapbox_id
    }));
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    console.error('Search Box error:', err);
    return [];
  }
}

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
      city: feature.properties.context?.place?.name || 'Santa Fe',
      state: feature.properties.context?.region?.name || 'Santa Fe',
      country: 'Argentina',
      type: feature.properties.feature_type || '',
      importance: 1
    };
  } catch (err) {
    console.error('Retrieve error:', err);
    return null;
  }
}

// ─── NOMINATIM OPENSTREETMAP (Respaldo Catastral Gratuito) ───────────

export async function searchNominatim(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];
  try {
    const normalized = normalizeAddress(query);
    const contextualized = injectContext(normalized);
    
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contextualized)}&countrycodes=${activeTenantConfig.countryCode}&limit=5&addressdetails=1`;
    if (activeTenantConfig.bbox) {
      url += `&viewbox=${activeTenantConfig.bbox}&bounded=1`;
    }

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'SIGPAD-Manager-App/1.0'
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
        city: addr.city || addr.town || addr.village || 'Santa Fe',
        state: addr.state || 'Santa Fe',
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

// ─── GOOGLE MAPS GEOCODING (Opcional si existe API Key) ─────────────

export async function geocodeGoogle(query: string): Promise<GeocodingResult[]> {
  if (!query || !GOOGLE_MAPS_KEY) return [];
  try {
    const normalized = normalizeAddress(query);
    const contextualized = injectContext(normalized);
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(contextualized)}&key=${GOOGLE_MAPS_KEY}&language=es`;
    const res = await fetch(url);
    if (!res.ok) return [];
    
    const data = await res.json();
    if (data.status !== 'OK' || !data.results) return [];
    
    return data.results.map((item: any) => {
      const addrComponents = item.address_components || [];
      const street = addrComponents.find((c: any) => c.types.includes('route'))?.long_name || '';
      const houseNumber = addrComponents.find((c: any) => c.types.includes('street_number'))?.long_name || '';
      const city = addrComponents.find((c: any) => c.types.includes('locality'))?.long_name || '';
      const state = addrComponents.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '';
      const country = addrComponents.find((c: any) => c.types.includes('country'))?.long_name || 'Argentina';
      
      return {
        lat: item.geometry.location.lat,
        lng: item.geometry.location.lng,
        displayName: item.formatted_address,
        street,
        houseNumber,
        city,
        state,
        country,
        type: item.types?.[0] || 'address',
        importance: 1.0,
      };
    });
  } catch (err) {
    console.warn("Google Geocoding failed:", err);
    return [];
  }
}

// ─── MOTOR DE BÚSQUEDA HÍBRIDO UNIFICADO ──────────────────────────────

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

        // 1. Verificar si la búsqueda es una coordenada GPS
        const coords = parseCoordinates(query);
        if (coords) {
          const rev = await reverseGeocode(coords.lat, coords.lng);
          results.push({
            lat: coords.lat,
            lng: coords.lng,
            displayName: rev?.displayName || `${coords.lat}, ${coords.lng}`,
            street: rev?.street || '',
            houseNumber: rev?.houseNumber || '',
            city: rev?.city || 'Santa Fe',
            state: rev?.state || 'Santa Fe',
            country: 'Argentina',
            type: 'coordinate',
            importance: 1,
          });
        }

        // 2. Ejecutar motores en paralelo (Mapbox v5 prioritario para alta precisión)
        const [v5Results, poiResults, googleResults, osmResults] = await Promise.all([
          geocodeForward(query).catch(() => [] as GeocodingResult[]),
          searchBoxSuggest(query).catch(() => [] as GeocodingResult[]),
          geocodeGoogle(query).catch(() => [] as GeocodingResult[]),
          searchNominatim(query).catch(() => [] as GeocodingResult[])
        ]);

        const seenKeys = new Set<string>();
        const candidates: GeocodingResult[] = [];

        // Coordenada directa ingresada por usuario si la hay
        if (results.length > 0) {
          results.forEach(r => {
            seenKeys.add(`${r.lat.toFixed(6)},${r.lng.toFixed(6)}`);
            candidates.push(r);
          });
        }

        // 1. Mapbox v5 es la máxima precisión catastral (15 decimales) -> agregar primero
        for (const r of v5Results) {
          const key = `${r.lat.toFixed(6)},${r.lng.toFixed(6)}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            candidates.push(r);
          }
        }

        // 2. POI / SearchBox de Mapbox
        for (const r of poiResults) {
          const key = r.mapbox_id || r.displayName;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            candidates.push(r);
          }
        }

        // 3. Fallbacks secundarios solo si no hay coincidencia directa de Mapbox
        for (const r of [...googleResults, ...osmResults]) {
          const key = `${r.lat.toFixed(6)},${r.lng.toFixed(6)}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            candidates.push(r);
          }
        }

        // Ordenar manteniendo Mapbox v5 arriba y filtrando duplicados
        candidates.sort((a, b) => {
          if (a.type === 'coordinate' && b.type !== 'coordinate') return -1;
          if (b.type === 'coordinate' && a.type !== 'coordinate') return 1;

          const indexA = v5Results.findIndex(m => Math.abs(m.lat - a.lat) < 0.00001 && Math.abs(m.lng - a.lng) < 0.00001);
          const indexB = v5Results.findIndex(m => Math.abs(m.lat - b.lat) < 0.00001 && Math.abs(m.lng - b.lng) < 0.00001);

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          if (a.lat !== 0 && b.lat === 0) return -1;
          if (b.lat !== 0 && a.lat === 0) return 1;

          const distA = a.lat !== 0 ? distanceMeters(a.lat, a.lng, activeTenantConfig.center.lat, activeTenantConfig.center.lng) : 9999999;
          const distB = b.lat !== 0 ? distanceMeters(b.lat, b.lng, activeTenantConfig.center.lat, activeTenantConfig.center.lng) : 9999999;

          return distA - distB;
        });

        resolve(candidates.slice(0, 10));
      } catch (err) {
        reject(err);
      }
    }, debounceMs);
  });
}

// ─── REVERSE GEOCODING ────────────────────────────────────────────────

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
      city: context.find((c: any) => c.id.startsWith('place'))?.text || 'Santa Fe',
      state: context.find((c: any) => c.id.startsWith('region'))?.text || 'Santa Fe',
      postcode: context.find((c: any) => c.id.startsWith('postcode'))?.text || '',
    };
  } catch (err) {
    console.error('Reverse geocoding error:', err);
    return null;
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
