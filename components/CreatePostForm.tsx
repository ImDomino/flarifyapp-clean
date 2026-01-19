"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface CreatePostFormProps {
  userId: string;
}

export function CreatePostForm({ userId }: CreatePostFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [polymarketUrl, setPolymarketUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const supabase = createClient();
  const router = useRouter();

  const parsePolymarketUrl = async (url: string) => {
    try {
      // Extract market slug from URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const slug = pathParts[pathParts.length - 1];

      // In a real implementation, you would call Polymarket API here
      // For MVP, we'll return mock data
      return {
        market_title: "Sample Market: " + slug.replace(/-/g, " "),
        yes_price: Math.floor(Math.random() * 100),
        no_price: Math.floor(Math.random() * 100),
      };
    } catch (err) {
      throw new Error("Invalid Polymarket URL");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Parse Polymarket URL
      const marketData = await parsePolymarketUrl(polymarketUrl);

      // Create post
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          title,
          content,
          polymarket_url: polymarketUrl,
          market_title: marketData.market_title,
          yes_price: marketData.yes_price,
          no_price: marketData.no_price,
        });

      if (insertError) throw insertError;

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          placeholder="What's your insight?"
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

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
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
          "Create Post"
        )}
      </button>
    </form>
  );
}
