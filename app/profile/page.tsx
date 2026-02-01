"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Heart, MessageCircle, Users } from "lucide-react";
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
        <div className="bg-card rounded-3xl border border-white/10 p-8 card-shadow backdrop-blur-xl">
          <h1 className="text-2xl font-bold mb-4 text-foreground">
            Sign in to View Profile
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view your profile
          </p>
          <button
            onClick={login}
            className="px-6 py-3 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const username = user?.google?.name || user?.email?.address?.split('@')[0] || 'User';
  const email = user?.google?.email || user?.email?.address || '';

  // Mock data для позиций
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

  const activities = [
    {
      id: '1',
      type: 'like',
      content: 'Liked a post',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'comment',
      content: 'Commented on a poll',
      timestamp: '5 hours ago',
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-3xl border border-white/10 card-shadow backdrop-blur-xl overflow-hidden">
        {/* Cover/Banner */}
        <div className="h-32 bg-gradient-to-r from-[#2A56F2]/20 to-[#9DFECB]/20"></div>
        
        {/* Profile Info */}
        <div className="p-6 -mt-16">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] border-4 border-card flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {username[0].toUpperCase()}
              </span>
            </div>

            {/* Name & Bio */}
            <div className="flex-1 mt-16">
              <h1 className="text-3xl font-bold mb-2 text-foreground">
                {username}
              </h1>
              <p className="text-muted-foreground mb-2">
                {email}
              </p>
              
              {/* Wallet Address */}
              {user?.wallet?.address && (
                <div className="mb-4 flex items-center gap-2">
                  <div className="bg-secondary/50 rounded-lg px-3 py-1 border border-white/10">
                    <p className="text-xs font-mono text-muted-foreground">
                      {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.wallet?.address || '');
                      alert('Wallet address copied!');
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
              )}
              
              <div className="bg-secondary/30 rounded-lg p-4 border border-white/10">
                <p className="text-sm text-muted-foreground">
                  Prediction market enthusiast
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-16 text-center">
              <div className="bg-secondary/30 rounded-lg px-6 py-4 border border-white/10">
                <p className="text-3xl font-bold mb-1 text-foreground">
                  {posts.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Posts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl bg-card border border-white/10 p-6 text-center card-shadow backdrop-blur-xl">
          <p className="text-3xl font-semibold text-foreground mb-1">{posts.length}</p>
          <p className="text-sm text-muted-foreground">Posts</p>
        </div>
        <div className="rounded-2xl bg-card border border-white/10 p-6 text-center card-shadow backdrop-blur-xl">
          <p className="text-3xl font-semibold text-foreground mb-1">???</p>
          <p className="text-sm text-muted-foreground">Followers</p>
        </div>
        <div className="rounded-2xl bg-card border border-white/10 p-6 text-center card-shadow backdrop-blur-xl">
          <p className="text-3xl font-semibold text-foreground mb-1">???</p>
          <p className="text-sm text-muted-foreground">Following</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-3xl border border-white/10 card-shadow backdrop-blur-xl">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors relative ${
              activeTab === 'posts'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === 'posts' && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#2A56F2]/20 to-[#9DFECB]/20 rounded-t-3xl" />
            )}
            <span className="relative z-10">Posts</span>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors relative ${
              activeTab === 'positions'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === 'positions' && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#2A56F2]/20 to-[#9DFECB]/20 rounded-t-3xl" />
            )}
            <span className="relative z-10">Positions</span>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors relative ${
              activeTab === 'activity'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {activeTab === 'activity' && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#2A56F2]/20 to-[#9DFECB]/20 rounded-t-3xl" />
            )}
            <span className="relative z-10">Activity</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'posts' && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-muted-foreground mb-4">
                    You haven't created any posts yet
                  </p>
                  <button
                    onClick={() => router.push('/create')}
                    className="px-6 py-3 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-xl hover:opacity-90 transition-opacity font-medium"
                  >
                    Create Your First Post
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post, index) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-chart-1" />
                <h3 className="text-lg font-semibold text-foreground">My Polymarket Positions</h3>
              </div>

              {polymarketPositions.map((position, index) => (
                <div
                  key={position.id}
                  className="rounded-3xl bg-secondary/30 border border-white/10 p-6 card-shadow backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-foreground font-medium mb-2">{position.question}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          position.position === 'Yes'
                            ? 'bg-chart-1/20 text-chart-1'
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {position.position}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {position.amount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-semibold ${
                        position.isWinning ? 'text-chart-1' : 'text-destructive'
                      }`}>
                        {position.profit}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {position.currentOdds}% odds
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      style={{ width: `${position.currentOdds}%` }}
                      className={`h-full ${
                        position.position === 'Yes' ? 'bg-chart-1' : 'bg-destructive'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              {activities.map((activity) => {
                const getIcon = () => {
                  switch (activity.type) {
                    case 'like':
                      return <Heart className="w-5 h-5 text-chart-5" />;
                    case 'comment':
                      return <MessageCircle className="w-5 h-5 text-chart-2" />;
                    default:
                      return null;
                  }
                };

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 rounded-2xl bg-secondary/30 border border-white/10 p-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                      {getIcon()}
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground text-sm">{activity.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
