import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Objetivo no encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching objective:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Soft delete: set is_active to false
    const { data, error } = await supabase
      .from('objectives')
      .update({ is_active: false, status: 'Inactivo' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error deleting objective:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
