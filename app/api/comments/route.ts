import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Получить комментарии поста
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get('post_id');

    if (!post_id) {
      return NextResponse.json(
        { error: 'Missing post_id' },
        { status: 400 }
      );
    }

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles (
          id,
          email,
          username,
          avatar_url
        )
      `)
      .eq('post_id', post_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// Создать комментарий
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { post_id, content } = await request.json();

    if (!post_id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        user_id: user.id,
        content,
      })
      .select(`
        *,
        profiles (
          id,
          email,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
