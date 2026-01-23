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

    // Проверяем что пост принадлежит пользователю
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.user_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Удаляем пост (CASCADE удалит комментарии и лайки автоматически)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', post_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
