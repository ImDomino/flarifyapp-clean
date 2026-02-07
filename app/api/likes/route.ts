import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { post_id, user_id } = await request.json();

    if (!post_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing post_id or user_id' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select()
      .eq('post_id', post_id)
      .eq('user_id', user_id)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user_id);

      if (error) throw error;
      return NextResponse.json({ success: true, action: 'unliked' });
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ post_id, user_id });

      if (error) throw error;

      // Create notification for post owner (don't notify yourself)
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', post_id)
          .single();

        if (post && post.user_id !== user_id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            actor_id: user_id,
            type: 'like',
            post_id,
          });
        }
      } catch (e) {
        console.warn('Failed to create like notification:', e);
      }

      return NextResponse.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
