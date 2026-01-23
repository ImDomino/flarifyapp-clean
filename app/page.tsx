"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { Loader2 } from "lucide-react";
import type { PostWithUser } from "@/lib/types";

export default function Home() {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Загрузить посты
  const loadPosts = async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await fetch(`/api/posts?page=${pageNum}&limit=20`);
      const data = await response.json();

      if (append) {
        setPosts(prev => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }

      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Загрузить первую страницу
  useEffect(() => {
    loadPosts(1);
  }, []);

  // Load More
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-6 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-lg border border-primary/30">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-3xl">💰</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
            Flarifyapp
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          <strong>Prediction Markets</strong> • <strong>Social Network</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Builder Attribution • Embedded Wallets • Real Database
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">💰</div>
          <h3 className="font-semibold mb-1">Earn Commissions</h3>
          <p className="text-sm text-muted-foreground">
            Builder Attribution on all trades
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">🔐</div>
          <h3 className="font-semibold mb-1">Embedded Wallets</h3>
          <p className="text-sm text-muted-foreground">
            Google login, instant wallet
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-semibold mb-1">Real Database</h3>
          <p className="text-sm text-muted-foreground">
            Posts, likes, comments saved
          </p>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.length === 0 ? (
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
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors font-medium disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </span>
                  ) : (
                    "Load More Posts"
                  )}
                </button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                That's all for now! 🎉
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
