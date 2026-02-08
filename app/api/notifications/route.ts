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

    // Step 1: Fetch notifications (no FK join — actor_id is TEXT, not a FK to profiles)
    let query = supabase
      .from('notifications')
      .select(`
        *,
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

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Notifications query error:', error);
      // Ultimate fallback — no joins at all
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fallbackError) throw fallbackError;

      // Count unread
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      return NextResponse.json({
        notifications: fallbackData || [],
        unread_count: unreadCount || 0,
      });
    }

    // Step 2: Collect unique actor_ids and fetch their profiles separately
    const actorIds = [...new Set((notifications || []).map((n) => n.actor_id).filter(Boolean))];

    let actorMap: Record<string, any> = {};

    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', actorIds);

      if (profiles) {
        for (const p of profiles) {
          actorMap[p.id] = p;
        }
      }
    }

    // Step 3: Merge actor data into notifications
    const enrichedNotifications = (notifications || []).map((n) => ({
      ...n,
      actor: actorMap[n.actor_id] || null,
    }));

    // Step 4: Count unread
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return NextResponse.json({
      notifications: enrichedNotifications,
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