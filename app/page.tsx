import { PostCard } from "@/components/PostCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  
  // Получаем текущего пользователя
  const { data: { user } } = await supabase.auth.getUser();
  
  // Получаем посты
  const { data: posts } = await supabase
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

  // Получаем количество лайков и комментариев для каждого поста
  const postsWithData = await Promise.all(
    (posts || []).map(async (post) => {
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

      // Проверяем лайкнул ли пользователь этот пост
      let userHasLiked = false;
      if (user) {
        const { data: like } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .single();
        
        userHasLiked = !!like;
      }

      return {
        ...post,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        user_has_liked: userHasLiked,
      };
    })
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Demo Notice */}
      <div className="text-center py-6 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-lg border border-primary/30">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
            Flarifyapp + Polymarket
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          <strong>Builder Attribution</strong> + <strong>Supabase Database</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Real-time data • Embedded wallets • URL tracking
        </p>
      </div>

      {/* Features List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">💰</div>
          <h3 className="font-semibold mb-1">Builder Attribution</h3>
          <p className="text-sm text-muted-foreground">
            Earn commissions from user trades
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">🔗</div>
          <h3 className="font-semibold mb-1">URL Tracking</h3>
          <p className="text-sm text-muted-foreground">
            All links include builder_id
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold mb-1">Database Ready</h3>
          <p className="text-sm text-muted-foreground">
            Posts, likes, comments stored
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {postsWithData.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">
              No posts yet. Be the first to create one!
            </p>
            <a
              href="/create"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Create First Post
            </a>
          </div>
        ) : (
          postsWithData.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}
