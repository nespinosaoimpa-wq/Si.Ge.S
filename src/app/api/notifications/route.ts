import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/notifications?resource_id=X&unread_only=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resource_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    if (!resourceId) {
      return NextResponse.json({ error: 'resource_id es requerido' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[NOTIFICATIONS_GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/notifications — create a new notification
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { resource_id, type, title, body: notifBody, data: notifData } = body;

    if (!resource_id || !title) {
      return NextResponse.json({ error: 'resource_id y title son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        resource_id,
        type: type || 'general',
        title,
        body: notifBody || '',
        data: notifData || {},
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[NOTIFICATIONS_POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { notification_ids, resource_id, mark_all } = body;

    if (mark_all && resource_id) {
      // Mark all notifications as read for this resource
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('resource_id', resource_id)
        .eq('is_read', false);
      if (error) throw error;
    } else if (notification_ids && notification_ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notification_ids);
      if (error) throw error;
    } else {
      return NextResponse.json({ error: 'Debe indicar notification_ids o mark_all+resource_id' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[NOTIFICATIONS_PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
