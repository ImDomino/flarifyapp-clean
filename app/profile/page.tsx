"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
        <div className="bg-card rounded-[30px] border border-border p-8 card-shadow">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#140106', letterSpacing: '-1px' }}>
            Sign in to View Profile
          </h1>
          <p className="text-muted-foreground mb-6" style={{ letterSpacing: '-1px' }}>
            You need to be signed in to view your profile
          </p>
          <button
            onClick={login}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold"
            style={{ fontSize: '20px', letterSpacing: '-1px' }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const username = user?.google?.name || user?.email?.address?.split('@')[0] || 'User';
  const email = user?.google?.email || user?.email?.address || '';

  return (
    <div className="w-full space-y-6">
      {/* Profile Header */}
      <div className="bg-card rounded-[30px] border border-border card-shadow overflow-hidden">
        {/* Cover/Banner area */}
        <div className="h-32 bg-gradient-to-r from-primary/20 to-green-400/20"></div>
        
        {/* Profile Info */}
        <div className="p-6 -mt-16">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-[#C2C2C2] border-4 border-card flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {username[0].toUpperCase()}
              </span>
            </div>

            {/* Name & Bio */}
            <div className="flex-1 mt-16">
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#140106', letterSpacing: '-1px' }}>
                {username}
              </h1>
              <p className="text-muted-foreground mb-4" style={{ letterSpacing: '-1px' }}>
                {email}
              </p>
              <div className="bg-accent/30 rounded-lg p-4 border border-border">
                <p className="text-sm" style={{ color: '#989898', letterSpacing: '-1px' }}>
                  Here is bio
                </p>
              </div>
            </div>

            {/* Followers count */}
            <div className="mt-16 text-center">
              <div className="bg-accent/30 rounded-lg px-6 py-4 border border-border">
                <p className="text-3xl font-bold mb-1" style={{ color: '#140106' }}>
                  ???
                </p>
                <p className="text-sm" style={{ color: '#989898', letterSpacing: '-1px' }}>
                  Followers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-[30px] border border-border card-shadow">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'posts'
                ? 'border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontSize: '18px', letterSpacing: '-1px', color: activeTab === 'posts' ? '#140106' : '#989898' }}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'positions'
                ? 'border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontSize: '18px', letterSpacing: '-1px', color: activeTab === 'positions' ? '#140106' : '#989898' }}
          >
            Positions (Polymarket)
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'activity'
                ? 'border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ fontSize: '18px', letterSpacing: '-1px', color: activeTab === 'activity' ? '#140106' : '#989898' }}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'posts' && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-muted-foreground mb-4" style={{ fontSize: '20px', letterSpacing: '-1px' }}>
                    You haven't created any posts yet
                  </p>
                  <button
                    onClick={() => router.push('/create')}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold"
                    style={{ fontSize: '20px', letterSpacing: '-1px' }}
                  >
                    Create Your First Post
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="text-center py-16 px-6">
              <p className="text-muted-foreground mb-2" style={{ fontSize: '20px', letterSpacing: '-1px' }}>
                I have not idea what should be here
              </p>
              <p className="text-sm" style={{ color: '#989898', letterSpacing: '-1px' }}>
                This will show your active Polymarket positions
              </p>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-16 px-6">
              <p className="text-muted-foreground mb-2" style={{ fontSize: '20px', letterSpacing: '-1px' }}>
                Activity feed coming soon
              </p>
              <p className="text-sm" style={{ color: '#989898', letterSpacing: '-1px' }}>
                This will show your likes, comments, and trading activity
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
