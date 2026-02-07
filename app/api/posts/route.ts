import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const userId = searchParams.get('user_id'); // NEW: filter by user

    const supabase = createClient();

    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles (
          id,
          email,
          username,
          avatar_url,
          display_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Server-side user filter (no more client-side filtering of 100 posts)
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: posts, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;

    const postsWithCounts = await Promise.all(
      (posts || []).map(async (post) => {
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        return {
          ...post,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          user_has_liked: false,
        };
      })
    );

    return NextResponse.json({
      posts: postsWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
