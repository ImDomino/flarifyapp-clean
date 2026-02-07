"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { CheckCircle, Image as ImageIcon, X, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { MarketSearchInput } from "@/components/MarketSearchInput";

interface Market {
  id: string;
  question: string;
  description?: string;
  url: string;
  outcomes: string[];
  outcomePrices: number[] | null;
  volume: string;
  liquidity?: string;
  endDate?: string;
  yesTokenId?: string;
  noTokenId?: string;
  negRisk?: boolean;  // ← добавить
  tokens?: Array<{
    token_id: string;
    outcome: string;
  }>;
}

export default function CreatePage() {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const { authenticated, login, user } = usePrivy();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authenticated || !user) {
      login();
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('user_id', user.id);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Failed to upload image');
        }

        imageUrl = uploadData.url;
        setIsUploading(false);
      }

      let marketData = null;
      if (selectedMarket) {
        let yesTokenId: string | null = null;
        let noTokenId: string | null = null;

        if (selectedMarket.yesTokenId && selectedMarket.noTokenId) {
          yesTokenId = selectedMarket.yesTokenId;
          noTokenId = selectedMarket.noTokenId;
        } 
        else if (selectedMarket.tokens) {
          const yesToken = selectedMarket.tokens.find(t => t.outcome?.toLowerCase().includes('yes'));
          const noToken = selectedMarket.tokens.find(t => t.outcome?.toLowerCase().includes('no'));
          yesTokenId = yesToken?.token_id || null;
          noTokenId = noToken?.token_id || null;
        }

        if (yesTokenId || noTokenId || selectedMarket.id) {
          marketData = {
            question: selectedMarket.question,
            outcomes: selectedMarket.outcomes,
            prices: selectedMarket.outcomePrices,
            volume: selectedMarket.volume,
            url: selectedMarket.url,
            yesTokenId: yesTokenId || undefined,
            noTokenId: noTokenId || undefined,
            negRisk: selectedMarket.negRisk, //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
          };
        }
      }

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          user_id: user.id,
          image_url: imageUrl,
          polymarket_market_id: selectedMarket?.id || null,
          market_data: marketData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create post error:', error);
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="text-center py-12">
        <div className="rounded-xl bg-base-900/70 border border-white/5 shadow-card p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-4">
            Sign in to Create Posts
          </h1>
          <p className="text-slate-400 mb-6">
            You need to be signed in to create posts
          </p>
          <button
            onClick={login}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Create Post</h1>
        <p className="mt-1 text-sm text-slate-400">Share your thoughts with the community</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Post Content */}
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <label className="block text-sm font-semibold text-slate-200 mb-3">
            What's on your mind?
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your market insights, predictions, or analysis..."
            className="w-full min-h-[180px] bg-base-850/50 border border-white/10 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all placeholder:text-slate-500 text-slate-200"
            required
          />
          <div className="mt-2 flex justify-between items-center text-xs text-slate-500">
            <span>{content.length} characters</span>
            {content.length > 0 && <span className="text-teal-400">✓</span>}
          </div>
        </div>

        {/* Image Upload */}
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <label className="block text-sm font-semibold text-slate-200 mb-3">
            Image (optional)
          </label>
          
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <Image
                src={imagePreview}
                alt="Upload preview"
                width={690}
                height={400}
                className="w-full h-64 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 bg-base-850/50 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-base-850/70 hover:border-white/20 transition-all group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <ImageIcon className="w-10 h-10 text-slate-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm text-slate-400">Click to upload image</span>
              <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</span>
            </label>
          )}
        </div>

        {/* Polymarket Market */}
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <label className="block text-sm font-semibold text-slate-200 mb-3">
            Add Polymarket Market (optional)
          </label>
          <MarketSearchInput
            onSelectMarket={setSelectedMarket}
            selectedMarket={selectedMarket}
          />
        </div>

        {/* Success Message */}
        {success && (
          <div className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-teal-400" />
            <span className="text-sm font-medium text-teal-200">Post created! Redirecting...</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!content.trim() || isLoading || isUploading}
          className="relative w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
              Uploading Image...
            </span>
          ) : isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
              Creating...
            </span>
          ) : (
            <>
              <span className="relative z-10">Create Post</span>
              <span className="absolute inset-0 opacity-30 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.65),transparent)] -translate-x-[120%] animate-sheen"></span>
            </>
          )}
        </button>
      </form>

      {/* Tips */}
      <div className="rounded-xl bg-base-850/40 border border-white/5 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Tips for a great post:</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-teal-400 mt-0.5">•</span>
            <span>Be clear and concise with your message</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-400 mt-0.5">•</span>
            <span>Add relevant images to increase engagement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-400 mt-0.5">•</span>
            <span>Link to Polymarket markets for prediction discussions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-400 mt-0.5">•</span>
            <span>Be respectful and follow community guidelines</span>
          </li>
        </ul>
      </div>
    </div>
  );
}