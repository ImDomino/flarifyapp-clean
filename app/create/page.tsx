"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, CheckCircle, Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { MarketSearchInput } from "@/components/MarketSearchInput";
import { motion } from "framer-motion";

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

        console.log('🎯 selectedMarket from search:', selectedMarket);
        console.log('🎯 TokenIds from search:', { 
          yesTokenId, 
          noTokenId,
          hasYes: !!yesTokenId,
          hasNo: !!noTokenId,
        });

        if (yesTokenId || noTokenId || selectedMarket.id) {
          marketData = {
            question: selectedMarket.question,
            outcomes: selectedMarket.outcomes,
            prices: selectedMarket.outcomePrices,
            volume: selectedMarket.volume,
            url: selectedMarket.url,
            yesTokenId: yesTokenId || undefined,
            noTokenId: noTokenId || undefined,
          };
          
          console.log('📝 marketData being sent to API:', marketData);
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-white/10 p-8 card-shadow backdrop-blur-xl"
        >
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] bg-clip-text text-transparent">
            Sign in to Create Posts
          </h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to create posts
          </p>
          <button
            onClick={login}
            className="px-8 py-4 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-2xl hover:opacity-90 transition-opacity font-bold text-lg shadow-lg shadow-[#2A56F2]/30"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] bg-clip-text text-transparent">
          Create Post
        </h1>
        <p className="text-muted-foreground mb-8">
          Share your thoughts with the community
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6 bg-card p-8 rounded-3xl border border-white/10 card-shadow backdrop-blur-xl"
      >
        {/* Post Text */}
        <div className="space-y-3">
          <label htmlFor="post-text" className="text-sm font-semibold text-foreground">
            What's on your mind?
          </label>
          <textarea
            id="post-text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full min-h-[200px] bg-secondary/50 border border-white/10 rounded-2xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#2A56F2]/50 transition-all placeholder:text-muted-foreground text-foreground"
            required
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{content.length} characters</span>
            {content.length > 0 && <span className="text-[#9DFECB]">✓</span>}
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Image (optional)
          </label>
          
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/10">
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
            <label className="flex flex-col items-center justify-center h-48 bg-secondary/50 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-secondary/70 hover:border-white/20 transition-all group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm text-muted-foreground">Click to upload image</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</span>
            </label>
          )}
        </div>

        {/* Polymarket Market Field */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Add Polymarket Market (optional)
          </label>
          <MarketSearchInput
            onSelectMarket={setSelectedMarket}
            selectedMarket={selectedMarket}
          />
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-[#9DFECB]/10 border border-[#9DFECB]/20 rounded-2xl flex items-center space-x-3 text-[#9DFECB]"
          >
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Post created! Redirecting...</span>
          </motion.div>
        )}

        {/* Create Button */}
        <button
          type="submit"
          disabled={!content.trim() || isLoading || isUploading}
          className="w-full bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2A56F2]/20"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              Uploading Image...
            </span>
          ) : isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
              Creating...
            </span>
          ) : (
            'Create Post'
          )}
        </button>
      </motion.form>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6 bg-secondary/30 border border-white/5 rounded-2xl p-5 backdrop-blur-xl"
      >
        <h3 className="font-semibold text-sm mb-3 text-foreground">Tips for a great post:</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-[#9DFECB]">•</span>
            <span>Be clear and concise with your message</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#9DFECB]">•</span>
            <span>Add relevant images to increase engagement</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#9DFECB]">•</span>
            <span>Link to Polymarket markets for prediction discussions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#9DFECB]">•</span>
            <span>Be respectful and follow community guidelines</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
