import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// GET /api/notifications?user_id=X&unread_only=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createClient();

    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey (
          id, username, display_name, avatar_url
        ),
        post:posts (
          id, content
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      // If foreign key doesn't exist yet, fallback to simple query
      console.error('Notifications query error:', error);
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackError) throw fallbackError;
      return NextResponse.json({ notifications: fallbackData || [] });
    }

    // Count unread
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return NextResponse.json({
      notifications: data || [],
      unread_count: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications  { user_id, notification_ids?, mark_all? }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, notification_ids, mark_all } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createClient();

    if (mark_all) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user_id)
        .eq('read', false);

      if (error) throw error;
    } else if (notification_ids && notification_ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notification_ids)
        .eq('user_id', user_id);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
