import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { comment_id, user_id } = await request.json();

    if (!comment_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing comment_id or user_id' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Проверяем что комментарий принадлежит пользователю
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', comment_id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.user_id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Удаляем комментарий
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', comment_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
