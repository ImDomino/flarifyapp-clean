import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Получаем посты с профилями пользователей
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (
          id,
          email,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Для каждого поста получаем количество лайков и комментариев
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        // Количество лайков
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        // Количество комментариев
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        return {
          ...post,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
        };
      })
    );

    return NextResponse.json(postsWithCounts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
