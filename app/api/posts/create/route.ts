import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();
    const { title, content, polymarket_url, yes_price, no_price } = body;

    // Валидация
    if (!title || !content || !polymarket_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Создаём пост
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        title,
        content,
        polymarket_url,
        yes_price: yes_price || null,
        no_price: no_price || null,
        ref_code: process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_ID || 'FLARIFYAPP',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
