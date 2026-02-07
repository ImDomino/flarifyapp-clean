import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json({ error: 'Missing post_id' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          id,
          email,
          username,
          avatar_url,
          display_name
        )
      `)
      .eq('post_id', post_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { post_id, user_id, content } = await request.json();

    if (!post_id || !user_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({ post_id, user_id, content })
      .select()
      .single();

    if (error) throw error;

    // Create notification for post owner
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
          type: 'comment',
          post_id,
        });
      }
    } catch (e) {
      console.warn('Failed to create comment notification:', e);
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
