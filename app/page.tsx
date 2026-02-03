"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { Loader2, Search, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { PostWithUser } from "@/lib/types";

export default function Home() {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#2A56F2]/30 border-t-[#2A56F2] rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 text-center"
      >
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] bg-clip-text text-transparent">
          Welcome to Flarify
        </h1>
        <p className="text-muted-foreground text-lg">
          The social network for prediction markets
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative bg-card border border-white/10 rounded-3xl backdrop-blur-xl card-shadow">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-14 pr-4 py-4 bg-transparent border-none rounded-3xl focus:outline-none focus:ring-2 focus:ring-white/20 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </motion.div>

      {/* Create Post Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6 bg-card border border-white/10 rounded-3xl backdrop-blur-xl p-6 card-shadow hover:border-white/20 transition-all cursor-pointer group"
        onClick={() => router.push('/create')}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <input
            type="text"
            placeholder="What's the latest?"
            readOnly
            className="flex-1 bg-transparent border-none focus:outline-none text-muted-foreground cursor-pointer"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/create');
            }}
            className="px-6 py-3 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-2xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-[#2A56F2]/30"
          >
            Post
          </button>
        </div>
      </motion.div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-16 px-6 bg-card border border-white/10 rounded-3xl backdrop-blur-xl card-shadow"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#2A56F2]/20 to-[#9DFECB]/20 flex items-center justify-center">
            <Plus className="w-10 h-10 text-[#2A56F2]" />
          </div>
          <p className="text-muted-foreground mb-4 text-lg">
            No posts yet. Be the first to create one!
          </p>
          <button
            onClick={() => router.push('/create')}
            className="px-8 py-4 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-2xl hover:opacity-90 transition-opacity font-medium shadow-lg shadow-[#2A56F2]/30"
          >
            Create First Post
          </button>
        </motion.div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index % 5) }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </motion.div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center py-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-8 py-4 bg-card border border-white/10 rounded-2xl hover:bg-card/80 hover:border-white/20 transition-all font-medium disabled:opacity-50 card-shadow"
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-[#2A56F2]/30 border-t-[#2A56F2] rounded-full"
                    />
                    Loading...
                  </span>
                ) : (
                  "Load More Posts"
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <p className="text-muted-foreground text-sm">
                That's all for now! 🎉
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
