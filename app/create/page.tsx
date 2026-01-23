"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, CheckCircle } from "lucide-react";

export default function CreatePage() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();
  const { authenticated, login, user } = usePrivy();

  // DEBUG: Логируем что возвращает usePrivy
  useEffect(() => {
    console.log('=== PRIVY DEBUG ===');
    console.log('authenticated:', authenticated);
    console.log('user:', user);
    console.log('user.id:', user?.id);
    console.log('==================');
  }, [authenticated, user]); // Добавил user

  // Создание поста
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authenticated || !user) {
      login();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          user_id: user.id, // Privy user ID
        }),
      });

      const data = await response.json();
      
      console.log('API response:', data); // Debug

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        console.error('API error:', data.error); // Debug
        throw new Error(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create post error:', error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-card rounded-lg border border-border p-8">
          <h1 className="text-2xl font-bold mb-4">Sign in to Create Posts</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to create posts
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
        Create New Post
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg border border-border">
        {/* Content */}
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            What's on your mind?
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
            placeholder="Share your thoughts, predictions, or analysis..."
          />
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center space-x-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span>Post created! Redirecting...</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-effect"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Creating Post...
            </span>
          ) : (
            "Create Post"
          )}
        </button>
      </form>
    </div>
  );
}
