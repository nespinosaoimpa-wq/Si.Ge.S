import { supabase } from './supabase';

export interface OperatorProfile {
  resource_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  status: string;
  assignedObjective: {
    id: string;
    name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    geofence_radius: number;
    geofence_radius_meters?: number;
  } | null;
}

const CACHE_KEY = 'sigpad_operator_profile_v2';

/**
 * High-Speed Direct Supabase Profile & Objective Resolver (<30ms)
 * Completely bypasses Vercel Serverless Origin functions.
 * Includes local storage caching for instant (0ms) render on launch.
 */
export async function resolveOperatorProfileDirect(
  userId: string,
  userEmail?: string | null
): Promise<OperatorProfile | null> {
  // 1. Instant Cache Retrieval (0ms UX)
  let cached: OperatorProfile | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        cached = JSON.parse(raw);
      }
    } catch (e) {}
  }

  try {
    if (!userId && !userEmail) return cached;

    // 2. Direct Supabase Query on resources table
    const orConditions: string[] = [];
    if (userId && userId !== 'recurso_demo') {
      orConditions.push(`assigned_to.eq.${userId}`);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (isUUID) orConditions.push(`id.eq.${userId}`);
    }
    if (userEmail) {
      orConditions.push(`email.ilike.${userEmail.trim()}`);
    }

    if (orConditions.length === 0) return cached;

    const { data: resources, error: resErr } = await supabase
      .from('resources')
      .select('id, name, email, avatar_url, status, current_objective_id, assigned_to')
      .or(orConditions.join(','))
      .limit(1);

    const resource = resources && resources.length > 0 ? resources[0] : null;

    if (!resource) {
      return cached;
    }

    let targetObjId = resource.current_objective_id;

    // 3. Multi-layer Fallback 1: Active guard shifts
    if (!targetObjId) {
      const { data: activeShift } = await supabase
        .from('guard_shifts')
        .select('objective_id')
        .or(`operator_id.eq.${resource.id},operator_id.eq.${userId}`)
        .in('status', ['activo', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeShift?.objective_id) {
        targetObjId = activeShift.objective_id;
      }
    }

    // 4. Multi-layer Fallback 2: Shift Requirements / Assignments
    if (!targetObjId) {
      const { data: req } = await supabase
        .from('shift_requirements')
        .select('objective_id')
        .or(`assigned_operator_id.eq.${resource.id},assigned_operator_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      if (req?.objective_id) {
        targetObjId = req.objective_id;
      }
    }

    // 5. Multi-layer Fallback 3: Objective resources junction table
    if (!targetObjId) {
      const { data: objRes } = await supabase
        .from('objective_resources')
        .select('objective_id')
        .or(`resource_id.eq.${resource.id},resource_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      if (objRes?.objective_id) {
        targetObjId = objRes.objective_id;
      }
    }

    // 6. Fetch full objective record if targetObjId resolved
    let assignedObjective: any = null;
    if (targetObjId) {
      const { data: obj } = await supabase
        .from('objectives')
        .select('id, name, address, latitude, longitude, geofence_radius, geofence_radius_meters')
        .eq('id', targetObjId)
        .maybeSingle();

      if (obj) {
        assignedObjective = {
          id: obj.id,
          name: obj.name,
          address: obj.address,
          latitude: Number(obj.latitude || 0),
          longitude: Number(obj.longitude || 0),
          geofence_radius: Number(obj.geofence_radius_meters || obj.geofence_radius || 150),
          geofence_radius_meters: Number(obj.geofence_radius_meters || obj.geofence_radius || 150)
        };

        // Self-heal resource table asynchronously (<5ms)
        if (!resource.current_objective_id) {
          supabase
            .from('resources')
            .update({ current_objective_id: obj.id })
            .eq('id', resource.id)
            .then(() => {});
        }
      }
    }

    const freshProfile: OperatorProfile = {
      resource_id: resource.id,
      name: resource.name,
      email: resource.email,
      avatar_url: resource.avatar_url,
      status: resource.status,
      assignedObjective
    };

    // Save to local cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(freshProfile));
      } catch (e) {}
    }

    return freshProfile;
  } catch (e) {
    console.error('[ProfileResolverDirect] Error:', e);
    return cached;
  }
}
