import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    
    const { post_id } = await request.json();

    if (!post_id) {
      return NextResponse.json(
        { error: 'Missing post_id' },
        { status: 400 }
      );
    }

    // Получаем пользователя (может быть null если не залогинен)
    const { data: { user } } = await supabase.auth.getUser();

    // Записываем клик
    const { error } = await supabase
      .from('clicks')
      .insert({
        post_id,
        user_id: user?.id || null,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error);
    return NextResponse.json(
      { error: 'Failed to track click' },
      { status: 500 }
    );
  }
}
