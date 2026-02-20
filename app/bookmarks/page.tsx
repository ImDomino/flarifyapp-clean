"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Bookmark, ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PostWithUser } from "@/lib/types";

export default function BookmarksPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadBookmarks = useCallback(async (p: number = 1) => {
    if (!user?.id) return;
    try {
      if (p === 1) setIsLoading(true);
      const res = await authFetch(`/api/bookmarks?page=${p}&limit=20`);
      const data = await res.json();
      const fetched = data.posts || [];
      setPosts((prev) => (p === 1 ? fetched : [...prev, ...fetched]));
      setHasMore(data.pagination?.hasMore || false);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authFetch]);

  useEffect(() => {
    if (authenticated) loadBookmarks();
  }, [authenticated, loadBookmarks]);

  const handleRemoved = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (!authenticated) {
    return (
      <div className="text-center py-20">
        <Bookmark className="w-8 h-8 mx-auto mb-4 text-zinc-700" />
        <h2 className="text-lg font-black uppercase tracking-wider mb-2">Sign in to view bookmarks</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black uppercase tracking-wider">Bookmarks</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-zinc-800 p-12 text-center">
          <Bookmark className="w-6 h-6 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm font-black uppercase tracking-wider text-zinc-500 mb-1">No bookmarks yet</p>
          <p className="text-xs text-zinc-700">Save posts to find them later</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post, i) => (
              <PostCard key={post.id} post={{ ...post, user_has_bookmarked: true }} index={i} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => { setPage((p) => p + 1); loadBookmarks(page + 1); }}
              className="w-full py-4 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 text-xs font-black uppercase tracking-widest transition-colors"
            >
              Load More
            </button>
          )}
        </>
      )}
    </div>
  );
}