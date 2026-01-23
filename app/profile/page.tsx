"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import type { PostWithUser } from "@/lib/types";

export default function ProfilePage() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        <div className="bg-card rounded-lg border border-border p-8">
          <h1 className="text-2xl font-bold mb-4">Sign in to View Profile</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to view your profile
          </p>
          <button
            onClick={login}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-start space-x-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">
              {username[0].toUpperCase()}
            </span>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {username}
            </h1>
            <p className="text-muted-foreground mb-4">{email}</p>
            
            <div className="bg-secondary/50 rounded-lg p-4 border border-border inline-block">
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Posts</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {posts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">My Posts</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground mb-4">
              You haven't created any posts yet
            </p>
            <button
              onClick={() => router.push('/create')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}