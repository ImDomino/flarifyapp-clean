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

    const { post_id } = await request.json();

    if (!post_id) {
      return NextResponse.json(
        { error: 'Missing post_id' },
        { status: 400 }
      );
    }

    // Проверяем есть ли уже лайк
    const { data: existingLike } = await supabase
      .from('likes')
      .select()
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Убираем лайк (unlike)
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post_id)
        .eq('user_id', user.id);

      if (error) throw error;

      return NextResponse.json({ success: true, action: 'unliked' });
    } else {
      // Добавляем лайк
      const { error } = await supabase
        .from('likes')
        .insert({
          post_id,
          user_id: user.id,
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
