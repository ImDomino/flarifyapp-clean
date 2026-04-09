"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Image as ImageIcon, X, ArrowLeft, Plus } from "lucide-react";
import Image from "next/image";
import { MarketSearchInput } from "@/components/MarketSearchInput";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";

const MAX_IMAGES = 4;

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

interface MediaEntry {
  file: File;
  preview: string;
  type: "image" | "video";
}

export default function CreatePage() {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<MediaEntry[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { authenticated, login, user } = usePrivy();
  const authFetch = useAuthFetch();

  const processMediaFile = (file: File) => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} files per post`);
      return;
    }
    const isVideo = file.type.startsWith("video/");
    const allowedImage = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideo = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedImage.includes(file.type) && !allowedVideo.includes(file.type)) {
      toast.error("Supported: JPEG, PNG, GIF, WebP, MP4, WebM, MOV");
      return;
    }
    const maxSize = 3.5 * 1024 * 1024; // 4.5MB Vercel limit
    if (file.size > maxSize) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 3.5MB.`);
      return;
    }
    // For video: can't use FileReader preview as img, use object URL
    if (isVideo) {
      const url = URL.createObjectURL(file);
      setImages((prev) => [...prev, { file, preview: url, type: "video" }]);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImages((prev) => [...prev, { file, preview: reader.result as string, type: "image" }]);
    };
    reader.readAsDataURL(file);
  };

  const processMultipleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) processMediaFile(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processMultipleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processMediaFile(file);
        return;
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files?.length) processMultipleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !user) { login(); return; }
    setIsLoading(true);

    try {
      // Upload all images
      let imageUrls: string[] = [];
      if (images.length > 0) {
        setIsUploading(true);
        for (const img of images) {
          const formData = new FormData();
          formData.append("file", img.file);
          const uploadResponse = await authFetch("/api/upload", { method: "POST", body: formData });
          if (uploadResponse.status === 413) throw new Error("File too large. Maximum 3.5MB per file.");
          const uploadData = await uploadResponse.json();
          if (!uploadData.success) throw new Error(uploadData.error || "Failed to upload image");
          imageUrls.push(uploadData.url);
        }
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

      // Send image_url as JSON array for multiple, or single string for one (backward compat)
      const imageUrlField = imageUrls.length === 0
        ? null
        : imageUrls.length === 1
          ? imageUrls[0]
          : JSON.stringify(imageUrls);

      const response = await authFetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          image_url: imageUrlField,
          polymarket_market_id: selectedMarket?.id || null,
          market_data: marketData,
        }),
      });

      if (!response.ok) throw new Error("Failed to create post");
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post. Please try again.");
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
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold uppercase tracking-wider text-sm">Back</span>
        </button>
        <h1 className="text-xl font-black uppercase tracking-wider">Create Post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          className={`bg-[#0a0a0a] border interact-border relative transition-all duration-200 ${
            isDragging ? "border-white ring-1 ring-white/20" : "border-zinc-800"
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-14 h-14 border-2 border-dashed border-zinc-500 flex items-center justify-center mb-3 animate-pulse">
                <ImageIcon className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Drop images here
              </p>
            </div>
          )}

          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="WHAT IS HAPPENING?" rows={6}
            className="w-full bg-transparent p-5 sm:p-6 text-white text-lg font-medium placeholder-zinc-700 placeholder:uppercase placeholder:tracking-wider focus:outline-none resize-none" />

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="px-5 pb-4">
              <div className={`grid gap-2 ${
                images.length === 1 ? "grid-cols-1" :
                images.length === 2 ? "grid-cols-2" :
                "grid-cols-2"
              }`}>
                {images.map((img, i) => (
                  <div
                    key={i}
                    className={`border border-zinc-800 relative overflow-hidden group ${
                      images.length === 3 && i === 0 ? "col-span-2" : ""
                    }`}
                  >
                    {img.type === "video" ? (
                      <video
                        src={img.preview}
                        className={`w-full object-cover ${
                          images.length === 1 ? "max-h-64" : "h-40"
                        }`}
                        muted
                        playsInline
                        onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseOut={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                    ) : (
                      <Image
                        src={img.preview}
                        alt={`Preview ${i + 1}`}
                        width={690}
                        height={400}
                        className={`w-full object-cover ${
                          images.length === 1 ? "max-h-64" : "h-40"
                        }`}
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/80 border border-zinc-700 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed border-zinc-800 hover:border-zinc-600 flex items-center justify-center transition-colors ${
                      images.length === 3 ? "h-40" : images.length === 1 ? "h-20" : "h-40"
                    }`}
                  >
                    <Plus className="w-5 h-5 text-zinc-600" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest mt-2">
                {images.length}/{MAX_IMAGES} images
              </p>
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
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple onChange={handleImageSelect} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-800 transition-all">
                <ImageIcon className="w-5 h-5" />
              </button>
              {images.length === 0 && (
                <span className="text-[11px] text-zinc-700 uppercase tracking-wider font-bold hidden sm:inline">
                  Images or video — drag & drop or Ctrl+V
                </span>
              )}
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
        <button type="submit" disabled={isLoading || (!content.trim() && images.length === 0)}
          className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          {isUploading ? `Uploading ${images.length} image${images.length > 1 ? "s" : ""}...` : isLoading ? "Creating Post..." : "Publish Post"}
        </button>
      </form>
    </div>
    </PageTransition>
  );
}
