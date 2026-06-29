import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: Request) {
  try {
    const { operator_id, round_id, checkpoint_id, latitude, longitude, accuracy, shift_id } = await request.json();
    const supabase = createClient();

    // 1. Fetch checkpoint coords from database
    const { data: cp, error: cpError } = await supabase
      .from('checkpoints')
      .select('latitude, longitude')
      .eq('id', checkpoint_id)
      .single();

    if (cpError || !cp) {
      console.error('[CHECKPOINT_VALIDATION] Error fetching checkpoint:', cpError);
      return NextResponse.json({ error: 'Checkpoint no encontrado' }, { status: 404 });
    }

    // 2. Calculate distance in meters using Haversine formula
    const dist = haversineMeters(latitude, longitude, cp.latitude, cp.longitude);
    const isWithinGeofence = dist <= 25; // 25 meters threshold

    // 3. Register the patrol log in patrol_checkpoint_logs
    const { data, error } = await supabase
      .from('patrol_checkpoint_logs')
      .insert({
        round_id: round_id || null,
        checkpoint_id,
        operator_id,
        latitude,
        longitude,
        accuracy: accuracy || null,
        validated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[CHECKPOINT_VALIDATION] Error inserting log:', error);
      throw error;
    }

    return NextResponse.json({
      log: data,
      warning: !isWithinGeofence ? `Punto registrado fuera de geocerca (Distancia: ${Math.round(dist)}m)` : null
    });
  } catch (error: any) {
    console.error('[CHECKPOINT_VALIDATION] Catch error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
