import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, user_id } = body;

    console.log('Creating post with:', { content: content?.slice(0, 50), user_id }); // Debug

    // Валидация
    if (!content || !user_id) {
      console.error('Missing fields:', { content: !!content, user_id: !!user_id }); // Debug
      return NextResponse.json(
        { error: 'Content and user_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Проверяем существует ли профиль
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', user_id, profileError); // Debug
      
      // Пытаемся создать профиль автоматически
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user_id,
          email: 'temp@email.com', // Временный
          username: 'User' + user_id.slice(0, 8),
        });
      
      if (createError) {
        console.error('Failed to create profile:', createError); // Debug
        return NextResponse.json(
          { error: 'User profile not found. Please log out and log in again.' },
          { status: 400 }
        );
      }
    }

    // Создаём пост
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user_id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error); // Debug
      throw error;
    }

    console.log('Post created successfully:', post.id); // Debug
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create post' },
      { status: 500 }
    );
  }
}
