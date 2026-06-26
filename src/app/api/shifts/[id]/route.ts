import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * DELETE /api/shifts/[id]
 * Deletes a shift record by ID using service role to ensure persistence.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Perform deletion
    const { error } = await supabase
      .from('guard_shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[SHIFT_DELETE] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Shift ${id} deleted successfully` });
  } catch (error: any) {
    console.error('[SHIFT_DELETE] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
