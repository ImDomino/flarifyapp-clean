"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { Loader2, Search } from "lucide-react";
import type { PostWithUser } from "@/lib/types";

export default function Home() {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  useEffect(() => {
    loadPosts(1);
  }, []);

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
    <div className="w-full">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative bg-card border border-border rounded-[30px] card-shadow">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-14 pr-4 py-4 bg-transparent border-none rounded-[30px] focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
            style={{ fontSize: '20px', letterSpacing: '-1px' }}
          />
        </div>
      </div>

      {/* Posts Container */}
      <div className="bg-card border border-border rounded-[30px] card-shadow overflow-hidden">
        {/* Create Post Header */}
        <div className="border-b border-border p-6 flex items-center justify-between bg-card">
          <input
            type="text"
            placeholder="What's the latest?"
            readOnly
            onClick={() => window.location.href = '/create'}
            className="flex-1 bg-transparent border-none focus:outline-none text-muted-foreground cursor-pointer"
            style={{ fontSize: '20px', letterSpacing: '-1px' }}
          />
          <button
            onClick={() => window.location.href = '/create'}
            className="px-8 py-3 bg-card border border-border rounded-xl font-bold text-foreground hover:bg-accent transition-colors"
            style={{ fontSize: '20px', letterSpacing: '-1px' }}
          >
            Post
          </button>
        </div>

        {/* Posts List */}
        <div className="divide-y divide-border">
          {posts.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-muted-foreground mb-4" style={{ fontSize: '20px', letterSpacing: '-1px' }}>
                No posts yet. Be the first to create one!
              </p>
              <button
                onClick={() => window.location.href = '/create'}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold"
                style={{ fontSize: '20px', letterSpacing: '-1px' }}
              >
                Create First Post
              </button>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-3 bg-card border border-border rounded-xl hover:bg-accent transition-colors font-semibold disabled:opacity-50"
                    style={{ fontSize: '20px', letterSpacing: '-1px', color: '#140106' }}
                  >
                    {isLoadingMore ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      "Load More Posts"
                    )}
                  </button>
                </div>
              )}

              {!hasMore && posts.length > 0 && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm" style={{ letterSpacing: '-1px' }}>
                    That's all for now! 🎉
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
