"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Heart, MessageCircle, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import type { PostWithUser } from "@/lib/types";

export default function ProfilePage() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'positions' | 'activity'>('posts');

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (user) {
      loadUserPosts();
    }
  }, [authenticated, user]);

  const loadUserPosts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts?page=1&limit=100`);
      const data = await response.json();

      const userPosts = data.posts.filter((post: PostWithUser) => post.user_id === user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-card rounded-3xl border border-white/10 p-8 card-shadow backdrop-blur-xl"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#2A56F2]/20 to-[#9DFECB]/20 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-[#2A56F2]" />
          </div>
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] bg-clip-text text-transparent">
            Sign in to View Profile
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view your profile
          </p>
          <button
            onClick={login}
            className="px-8 py-4 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-2xl hover:opacity-90 transition-opacity font-medium shadow-lg shadow-[#2A56F2]/30"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const username = user?.google?.name || user?.email?.address?.split('@')[0] || 'User';
  const email = user?.google?.email || user?.email?.address || '';

  const polymarketPositions = [
    {
      id: '1',
      question: 'Will Trump win 2024?',
      position: 'Yes',
      amount: '$250',
      currentOdds: 52,
      profit: '+$45',
      isWinning: true,
    },
    {
      id: '2',
      question: 'Will Bitcoin hit $100k in 2025?',
      position: 'Yes',
      amount: '$500',
      currentOdds: 67,
      profit: '+$134',
      isWinning: true,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-3xl border border-white/10 card-shadow backdrop-blur-xl overflow-hidden"
      >
        {/* Cover Banner with Gradient */}
        <div className="h-32 bg-gradient-to-r from-[#2A56F2]/30 via-[#B47EFF]/20 to-[#9DFECB]/30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(42,86,242,0.1),transparent_50%)]" />
        </div>
        
        {/* Profile Info */}
        <div className="p-8 -mt-16 relative">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] border-4 border-card flex items-center justify-center shadow-xl"
            >
              <span className="text-5xl font-bold text-white">
                {username[0].toUpperCase()}
              </span>
            </motion.div>

            {/* Name & Bio */}
            <div className="flex-1 mt-16 min-w-[200px]">
              <h1 className="text-4xl font-bold mb-2 text-foreground">
                {username}
              </h1>
              <p className="text-muted-foreground mb-3">
                {email}
              </p>
              
              {/* Wallet Address */}
              {user?.wallet?.address && (
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <div className="bg-secondary/50 rounded-xl px-4 py-2 border border-white/10 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#2A56F2]" />
                    <p className="text-xs font-mono text-muted-foreground">
                      {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.wallet?.address || '');
                      alert('Wallet address copied!');
                    }}
                    className="text-xs text-[#2A56F2] hover:text-[#9DFECB] transition-colors font-medium"
                  >
                    Copy Address
                  </button>
                </div>
              )}
              
              <div className="bg-secondary/30 rounded-xl p-4 border border-white/10">
                <p className="text-sm text-muted-foreground">
                  🎯 Prediction market enthusiast
                </p>
              </div>
            </div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-16"
            >
              <div className="bg-gradient-to-br from-[#2A56F2]/10 to-[#9DFECB]/10 rounded-2xl px-8 py-6 border border-white/10 text-center">
                <p className="text-5xl font-bold mb-2 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] bg-clip-text text-transparent">
                  {posts.length}
                </p>
                <p className="text-sm text-muted-foreground font-medium">
                  Total Posts
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="rounded-2xl bg-card border border-white/10 p-6 text-center card-shadow backdrop-blur-xl hover:border-white/20 transition-all">
          <MessageCircle className="w-8 h-8 mx-auto mb-3 text-[#2A56F2]" />
          <p className="text-3xl font-bold text-foreground mb-1">{posts.length}</p>
          <p className="text-sm text-muted-foreground">Posts</p>
        </div>
        <div className="rounded-2xl bg-card border border-white/10 p-6 text-center card-shadow backdrop-blur-xl hover:border-white/20 transition-all">
          <Heart className="w-8 h-8 mx-auto mb-3 text-[#FF375F]" />
          <p className="text-3xl font-bold text-foreground mb-1">—</p>
          <p className="text-sm text-muted-foreground">Followers</p>
        </div>
        <div className="rounded-2xl bg-card border border-white/10 p-6 text-center card-shadow backdrop-blur-xl hover:border-white/20 transition-all">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 text-[#9DFECB]" />
          <p className="text-3xl font-bold text-foreground mb-1">—</p>
          <p className="text-sm text-muted-foreground">Following</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-card rounded-3xl border border-white/10 card-shadow backdrop-blur-xl overflow-hidden"
      >
        <div className="flex border-b border-white/10">
          {(['posts', 'positions', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-5 px-6 font-semibold capitalize transition-all relative ${
                activeTab === tab
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-[#2A56F2]/10 to-[#9DFECB]/10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'posts' && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-[#2A56F2]/30 border-t-[#2A56F2] rounded-full"
                  />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#2A56F2]/20 to-[#9DFECB]/20 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-[#2A56F2]" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    You haven't created any posts yet
                  </p>
                  <button
                    onClick={() => router.push('/create')}
                    className="px-6 py-3 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-2xl hover:opacity-90 transition-opacity font-medium shadow-lg shadow-[#2A56F2]/30"
                  >
                    Create Your First Post
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#9DFECB]" />
                <h3 className="text-lg font-semibold text-foreground">My Polymarket Positions</h3>
              </div>

              {polymarketPositions.map((position) => (
                <motion.div
                  key={position.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-3xl bg-secondary/30 border border-white/10 p-6 card-shadow backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-foreground font-medium mb-2">{position.question}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          position.position === 'Yes'
                            ? 'bg-[#9DFECB]/20 text-[#9DFECB]'
                            : 'bg-[#FF375F]/20 text-[#FF375F]'
                        }`}>
                          {position.position}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {position.amount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${
                        position.isWinning ? 'text-[#9DFECB]' : 'text-[#FF375F]'
                      }`}>
                        {position.profit}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {position.currentOdds}% odds
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${position.currentOdds}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={position.position === 'Yes' ? 'bg-[#9DFECB]' : 'bg-[#FF375F]'}
                      style={{ height: '100%' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Activity feed coming soon...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
