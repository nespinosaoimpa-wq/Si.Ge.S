import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status, comment } = await request.json();
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('geofencing_incidents')
      .update({
        status,
        supervisor_comment: comment
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[RESOLVE_INCIDENT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
