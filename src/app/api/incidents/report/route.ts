import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('incident_reports')
      .insert({
        ...body,
        timestamp_synced: new Date().toISOString(),
        status: 'abierto'
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger strategic alert check if it's a critical incident
    if (body.urgency_level === 'critica') {
      await supabase.from('strategic_alerts').insert({
        alert_type: 'patron_delictivo',
        title: `INCIDENTE CRÍTICO: ${body.incident_type}`,
        description: body.description,
        severity: 'critica',
        latitude: body.latitude,
        longitude: body.longitude,
        related_incidents: [data.id]
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
