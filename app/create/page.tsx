"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, CheckCircle, Image as ImageIcon, X } from "lucide-react";
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
        const yesTokenId = selectedMarket.yesTokenId;
        const noTokenId = selectedMarket.noTokenId;

        console.log('🎯 selectedMarket from search:', selectedMarket);
        console.log('🎯 TokenIds from search:', { 
          yesTokenId, 
          noTokenId,
          hasYes: !!yesTokenId,
          hasNo: !!noTokenId,
        });

        marketData = {
          question: selectedMarket.question,
          outcomes: selectedMarket.outcomes,
          prices: selectedMarket.outcomePrices,
          volume: selectedMarket.volume,
          url: selectedMarket.url,
          yesTokenId,
          noTokenId,
        };
        
        console.log('📝 marketData being sent to API:', marketData);
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
        <div className="bg-card rounded-lg border border-border p-8 card-shadow">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#140106', letterSpacing: '-1px' }}>
            Sign in to Create Posts
          </h1>
          <p className="text-muted-foreground mb-6" style={{ letterSpacing: '-1px' }}>
            You need to be signed in to create posts
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

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#140106', letterSpacing: '-1px' }}>
        Create New Post
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-[30px] border border-border card-shadow">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#140106', letterSpacing: '-1px' }}>
            What's on your mind?
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Share your thoughts, predictions, or analysis..."
            style={{ fontSize: '20px', lineHeight: '24px', letterSpacing: '-1px', color: '#140106' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#140106', letterSpacing: '-1px' }}>
            Add Image (optional)
          </label>
          
          {!imagePreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 border-2 border-dashed border-border rounded-lg hover:bg-accent/30 transition-colors flex flex-col items-center gap-2"
            >
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
              <span className="text-muted-foreground" style={{ letterSpacing: '-1px' }}>
                Click to upload image
              </span>
            </button>
          ) : (
            <div className="relative">
              <div className="relative w-full rounded-[30px] overflow-hidden border border-border" style={{ maxHeight: '400px' }}>
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={690}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#140106', letterSpacing: '-1px' }}>
            Add Polymarket Market (optional)
          </label>
          <MarketSearchInput
            onSelectMarket={setSelectedMarket}
            selectedMarket={selectedMarket}
          />
        </div>

        {success && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center space-x-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span style={{ letterSpacing: '-1px' }}>Post created! Redirecting...</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isUploading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: '20px', letterSpacing: '-1px' }}
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Uploading Image...
            </span>
          ) : isLoading ? (
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
