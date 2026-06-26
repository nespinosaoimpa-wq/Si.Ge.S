/**
 * Nearby Emergency Services Engine
 * Uses Overpass API (OpenStreetMap) to find hospitals, police stations,
 * and fire stations near a given coordinate.
 */

import { distanceMeters } from './geocoding';

export interface NearbyPOI {
  id: number;
  type: 'hospital' | 'police' | 'fire_station' | 'pharmacy';
  name: string;
  latitude: number;
  longitude: number;
  distance: number;       // meters from the objective
  estimatedETA: number;   // estimated response time in minutes
  address?: string;
  phone?: string;
}

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Average urban response speed (km/h) for ETA estimation
const RESPONSE_SPEEDS: Record<string, number> = {
  hospital: 40,     // ambulance in urban area
  police: 50,       // patrol car
  fire_station: 45, // fire truck
  pharmacy: 30,     // civilian speed
};

/**
 * Fetch nearby emergency services for a given coordinate
 * @param lat - Latitude of the objective
 * @param lng - Longitude of the objective
 * @param radiusMeters - Search radius in meters (default 3000m = 3km)
 */
export async function fetchNearbyEmergencyServices(
  lat: number,
  lng: number,
  radiusMeters = 3000
): Promise<NearbyPOI[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="police"](around:${radiusMeters},${lat},${lng});
      node["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="police"](around:${radiusMeters},${lat},${lng});
      way["amenity"="fire_station"](around:${radiusMeters},${lat},${lng});
    );
    out center body;
  `;

  try {
    const res = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!res.ok) {
      console.warn('[NearbyPOI] Overpass API returned', res.status);
      return [];
    }

    const data = await res.json();
    const elements = data.elements || [];

    const pois: NearbyPOI[] = elements
      .map((el: any) => {
        const elLat = el.lat || el.center?.lat;
        const elLng = el.lon || el.center?.lon;
        if (!elLat || !elLng) return null;

        const amenity = el.tags?.amenity;
        const poiType = amenity === 'hospital' ? 'hospital'
          : amenity === 'police' ? 'police'
          : amenity === 'fire_station' ? 'fire_station'
          : amenity === 'pharmacy' ? 'pharmacy'
          : null;

        if (!poiType) return null;

        const dist = distanceMeters(lat, lng, elLat, elLng);
        const speedKmh = RESPONSE_SPEEDS[poiType] || 40;
        const etaMinutes = Math.round((dist / 1000) / speedKmh * 60);

        return {
          id: el.id,
          type: poiType,
          name: el.tags?.name || getDefaultName(poiType),
          latitude: elLat,
          longitude: elLng,
          distance: Math.round(dist),
          estimatedETA: Math.max(1, etaMinutes),
          address: el.tags?.['addr:street'] 
            ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`.trim()
            : undefined,
          phone: el.tags?.phone || el.tags?.['contact:phone'],
        } as NearbyPOI;
      })
      .filter(Boolean) as NearbyPOI[];

    // Sort by distance
    pois.sort((a, b) => a.distance - b.distance);

    return pois;
  } catch (err) {
    console.error('[NearbyPOI] Error fetching emergency services:', err);
    return [];
  }
}

function getDefaultName(type: string): string {
  switch (type) {
    case 'hospital': return 'Hospital / Centro de Salud';
    case 'police': return 'Comisaría';
    case 'fire_station': return 'Estación de Bomberos';
    case 'pharmacy': return 'Farmacia';
    default: return 'Establecimiento';
  }
}

/**
 * Get icon/color config for a POI type (for map markers)
 */
export function getPOIStyle(type: NearbyPOI['type']): { color: string; emoji: string; label: string } {
  switch (type) {
    case 'hospital': return { color: '#ef4444', emoji: '🏥', label: 'Hospital' };
    case 'police': return { color: '#3b82f6', emoji: '🚔', label: 'Policía' };
    case 'fire_station': return { color: '#f97316', emoji: '🚒', label: 'Bomberos' };
    case 'pharmacy': return { color: '#22c55e', emoji: '💊', label: 'Farmacia' };
  }
}
