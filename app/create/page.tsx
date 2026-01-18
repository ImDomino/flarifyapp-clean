"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";

export default function CreatePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [polymarketUrl, setPolymarketUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate post creation
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center py-4 bg-yellow-500/10 rounded-lg border border-yellow-500/50 mb-6">
        <div className="text-yellow-500 font-semibold mb-1">
          🧪 DEMO MODE
        </div>
        <p className="text-muted-foreground text-sm">
          Post won't be saved • Testing UI only
        </p>
      </div>

      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
        Create New Post
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg border border-border">
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
            placeholder="What's your prediction?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
            placeholder="Share your analysis..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Polymarket URL
          </label>
          <input
            type="url"
            value={polymarketUrl}
            onChange={(e) => setPolymarketUrl(e.target.value)}
            required
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
            placeholder="https://polymarket.com/market/..."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We'll automatically fetch market data from this URL
          </p>
        </div>

        {success && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center space-x-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span>Post "created" (demo)! Redirecting...</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-effect"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Creating...
            </span>
          ) : (
            "Create Post (Demo)"
          )}
        </button>
      </form>
    </div>
  );
}
