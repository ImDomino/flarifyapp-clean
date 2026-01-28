import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, user_id, image_url } = body;

    if (!content || !user_id) {
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
      // Пытаемся создать профиль автоматически
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user_id,
          email: '',
          username: `User${user_id.slice(-6)}`,
        });
      
      if (createError) {
        console.error('Failed to create profile:', createError);
        return NextResponse.json(
          { error: 'User profile not found. Please log out and log in again.' },
          { status: 400 }
        );
      }
    }

    // Создаём пост
    const postData: any = {
      user_id,
      content,
    };

    if (image_url) {
      postData.image_url = image_url;
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('Post created successfully:', post.id);
    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create post' },
      { status: 500 }
    );
  }
}
