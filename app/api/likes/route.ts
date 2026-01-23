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

    // Проверяем есть ли уже лайк
    const { data: existingLike } = await supabase
      .from('likes')
      .select()
      .eq('post_id', post_id)
      .eq('user_id', user_id)
      .single();

    if (existingLike) {
      // Убираем лайк (unlike)
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user_id);

      if (error) throw error;

      return NextResponse.json({ success: true, action: 'unliked' });
    } else {
      // Добавляем лайк
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id,
          user_id,
        });

      if (error) throw error;

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
