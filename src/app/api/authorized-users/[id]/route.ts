import { createServiceClient } from '@/lib/supabase-server';
import { isConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { removeFromMemoryWhitelist } from '@/lib/memory-whitelist';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isConfigured) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const userCookie = req.cookies.get('SIGPAD_user');
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('authorized_users')
      .update({ 
        status, 
        approved_at: status === 'approved' ? new Date().toISOString() : null 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error updating authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    
    // First, try deleting from authorized_users by ID
    await supabase.from('authorized_users').delete().eq('id', id);

    // If ID contains email or prefix, try deleting by email
    const emailCandidate = id.replace(/^auth-/, '');
    if (emailCandidate.includes('@')) {
      removeFromMemoryWhitelist(emailCandidate);
      await supabase.from('authorized_users').delete().ilike('email', emailCandidate);
      await supabase.from('resources').delete().ilike('email', emailCandidate);
    } else {
      // Also delete from resources by ID
      await supabase.from('resources').delete().eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting authorized user:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
