"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Image as ImageIcon, X, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { MarketSearchInput } from "@/components/MarketSearchInput";
import { useAuthFetch } from "@/hooks/useAuthFetch";

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
  negRisk?: boolean;
  tokens?: Array<{ token_id: string; outcome: string }>;
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
  const authFetch = useAuthFetch();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !user) { login(); return; }
    setIsLoading(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        // SECURITY: user_id removed — server extracts from JWT
        const uploadResponse = await authFetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadResponse.json();
        if (!uploadData.success) throw new Error(uploadData.error || "Failed to upload image");
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
        } else if (selectedMarket.tokens) {
          const yesToken = selectedMarket.tokens.find((t) => t.outcome?.toLowerCase().includes("yes"));
          const noToken = selectedMarket.tokens.find((t) => t.outcome?.toLowerCase().includes("no"));
          yesTokenId = yesToken?.token_id || null;
          noTokenId = noToken?.token_id || null;
        }
        marketData = {
          question: selectedMarket.question,
          outcomes: selectedMarket.outcomes,
          prices: selectedMarket.outcomePrices,
          volume: selectedMarket.volume,
          url: selectedMarket.url,
          yesTokenId: yesTokenId || undefined,
          noTokenId: noTokenId || undefined,
          negRisk: selectedMarket.negRisk,
        };
      }

      // SECURITY: user_id removed from body — server extracts from JWT
      const response = await authFetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          image_url: imageUrl,
          polymarket_market_id: selectedMarket?.id || null,
          market_data: marketData,
        }),
      });

      if (!response.ok) throw new Error("Failed to create post");
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-[#0a0a0a] border-2 border-white p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-2 border-white flex items-center justify-center">
            <span className="text-3xl font-black text-white">✓</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider mb-2">Post Created</h2>
          <p className="text-sm text-zinc-500 uppercase tracking-wider">Redirecting to feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold uppercase tracking-wider text-sm">Back</span>
        </button>
        <h1 className="text-xl font-black uppercase tracking-wider">Create Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#0a0a0a] border border-zinc-800 interact-border">
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="WHAT IS HAPPENING?" rows={6}
            className="w-full bg-transparent p-5 sm:p-6 text-white text-lg font-medium placeholder-zinc-700 placeholder:uppercase placeholder:tracking-wider focus:outline-none resize-none" />
          {imagePreview && (
            <div className="px-5 pb-4 relative">
              <div className="border border-zinc-800 relative overflow-hidden">
                <Image src={imagePreview} alt="Preview" width={690} height={400} className="w-full h-auto object-cover max-h-64" unoptimized />
                <button type="button" onClick={removeImage} className="absolute top-3 right-3 w-8 h-8 bg-black border border-zinc-700 flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {selectedMarket && (
            <div className="px-5 pb-4">
              <div className="border border-zinc-800 p-4 bg-[#111] relative">
                <button type="button" onClick={() => setSelectedMarket(null)} className="absolute top-3 right-3 w-6 h-6 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors">
                  <X className="w-3 h-3" />
                </button>
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2 block">Attached Market</span>
                <p className="text-sm font-bold text-white pr-8">{selectedMarket.question}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800">
            <div className="flex gap-3">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-800 transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <span className="text-xs font-mono text-zinc-600">{content.length}/500</span>
          </div>
        </div>
        {!selectedMarket && (
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Attach Market (Optional)</label>
            <MarketSearchInput onSelectMarket={setSelectedMarket} />
          </div>
        )}
        <button type="submit" disabled={isLoading || (!content.trim() && !imageFile)}
          className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          {isUploading ? "Uploading Image..." : isLoading ? "Creating Post..." : "Publish Post"}
        </button>
      </form>
    </div>
  );
}
