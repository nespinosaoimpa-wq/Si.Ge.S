import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID de incidente inválido' }, { status: 400 });
    }
    const body = await request.json();
    const supabase = createServiceClient();

    // Sanitize update fields to prevent arbitrary field override
    const allowedUpdates: any = {};
    if (body.status !== undefined) allowedUpdates.status = body.status;
    if (body.comment !== undefined) allowedUpdates.comment = body.comment;
    if (body.status === 'resolved' || body.status === 'resuelto') {
      allowedUpdates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('incidents')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data || { success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
