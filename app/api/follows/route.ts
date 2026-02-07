import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// GET /api/follows?user_id=X&viewer_id=Y
// Returns follower/following counts and whether viewer follows user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const viewerId = searchParams.get('viewer_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createClient();

    // Followers count (people following this user)
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    // Following count (people this user follows)
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    // Does the viewer follow this user?
    let isFollowing = false;
    if (viewerId && viewerId !== userId) {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('following_id', userId)
        .single();
      isFollowing = !!data;
    }

    return NextResponse.json({
      followers: followersCount || 0,
      following: followingCount || 0,
      isFollowing,
    });
  } catch (error) {
    console.error('Error fetching follow data:', error);
    return NextResponse.json({ error: 'Failed to fetch follow data' }, { status: 500 });
  }
}

// POST /api/follows  { follower_id, following_id }
// Toggle follow/unfollow
export async function POST(request: NextRequest) {
  try {
    const { follower_id, following_id } = await request.json();

    if (!follower_id || !following_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (follower_id === following_id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', follower_id)
      .eq('following_id', following_id)
      .single();

    if (existing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', follower_id)
        .eq('following_id', following_id);

      if (error) throw error;
      return NextResponse.json({ success: true, action: 'unfollowed' });
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id, following_id });

      if (error) throw error;
      return NextResponse.json({ success: true, action: 'followed' });
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    return NextResponse.json({ error: 'Failed to toggle follow' }, { status: 500 });
  }
}
