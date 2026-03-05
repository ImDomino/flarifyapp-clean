"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Send, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { MessageBubble, DateSeparator } from "@/components/MessageBubble";
import { PageTransition } from "@/components/PageTransition";
import Image from "next/image";

function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function ChatClient() {
  const { userId: rawUserId } = useParams();
  const recipientId = decodeURIComponent(rawUserId as string);
  const router = useRouter();
  const { user } = usePrivy();
  const authFetch = useAuthFetch();

  const { messages, isLoading, isSending, isTyping, sendMessage, sendTyping } = useChat({
    recipientId,
    userId: user?.id,
  });

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/profile?user_id=${encodeURIComponent(recipientId)}`)
      .then((r) => r.json())
      .then((d) => setRecipientProfile(d.profile))
      .catch(() => {});
  }, [recipientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = useCallback(() => {
    sendTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  }, [sendTyping]);

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

  const handleSend = async () => {
    if (!text.trim() && !imageFile) return;
    let imageUrl: string | undefined;
    if (imageFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await authFetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) imageUrl = data.url;
      } catch {}
      finally { setIsUploading(false); }
    }
    await sendMessage(text.trim(), imageUrl);
    setText("");
    removeImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messagesWithDates = useMemo(() => {
    const result: { type: "date" | "message"; date?: string; msg?: any }[] = [];
    messages.forEach((msg, i) => {
      if (i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at)) {
        result.push({ type: "date", date: msg.created_at });
      }
      result.push({ type: "message", msg });
    });
    return result;
  }, [messages]);

  const displayName = recipientProfile?.display_name || recipientProfile?.username || "User";
  const username = recipientProfile?.username || "user";
  const avatarUrl = recipientProfile?.avatar_url;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="geo-spinner mx-auto" />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-zinc-800/60 flex-shrink-0 relative overflow-hidden corner-accent">
        <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4 px-4 sm:px-5 py-3.5">
          <button
            onClick={() => router.push("/messages")}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            className="w-11 h-11 border-2 border-zinc-700 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0 hover:border-zinc-500 transition-colors group"
            onClick={() => router.push(`/user/${encodeURIComponent(recipientId)}`)}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <span className="text-sm font-black text-white uppercase">{displayName[0]}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-sm font-black uppercase tracking-wider truncate cursor-pointer hover:text-zinc-300 transition-colors"
              onClick={() => router.push(`/user/${encodeURIComponent(recipientId)}`)}
            >
              {displayName}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 font-bold tracking-wide">@{username}</span>
              {isTyping && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">typing</span>
                  <div className="flex items-center gap-0.5">
                    <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 relative">
        {/* Subtle vertical guide line */}
        <div className="absolute top-0 left-1/2 w-px h-full bg-zinc-900/50 pointer-events-none" />

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-scale-in">
              {/* Profile preview for empty state */}
              <div className="w-16 h-16 mx-auto mb-2 border-2 border-zinc-800 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-zinc-600 uppercase">{displayName[0]}</span>
                )}
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-0.5">
                {displayName}
              </h3>
              <p className="text-[10px] text-zinc-600 font-bold mb-6">@{username}</p>
              <div className="w-12 h-px bg-zinc-800 mx-auto mb-6" />
              <p className="text-[11px] text-zinc-600 font-medium uppercase tracking-wider">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            {messagesWithDates.map((item, i) =>
              item.type === "date" ? (
                <DateSeparator key={`date-${i}`} date={item.date!} />
              ) : (
                <MessageBubble
                  key={item.msg.id}
                  content={item.msg.content}
                  imageUrl={item.msg.image_url}
                  isSent={item.msg.sender_id === user?.id}
                  read={item.msg.read}
                  createdAt={item.msg.created_at}
                />
              )
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 sm:px-5 pb-2 flex-shrink-0 border-t border-zinc-800/30 pt-3 bg-[#080808]">
          <div className="relative inline-block border border-zinc-800">
            <Image src={imagePreview} alt="Preview" width={120} height={80} className="h-20 w-auto object-cover" unoptimized />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-black border border-zinc-700 flex items-center justify-center text-white hover:bg-red-900 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 bg-[#0a0a0a] border-t border-zinc-800/60 p-3 sm:p-4">
        <div className="flex items-end gap-2 bg-[#0e0e0e] border border-zinc-800/70 focus-within:border-zinc-600 transition-colors">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-zinc-600 hover:text-white transition-colors flex-shrink-0"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-zinc-600 focus:outline-none resize-none max-h-28 py-2.5"
          />
          <button
            onClick={handleSend}
            disabled={isSending || isUploading || (!text.trim() && !imageFile)}
            className="m-1.5 p-2.5 bg-white text-black hover:bg-zinc-200 transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0 group/send"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[9px] text-zinc-800 font-mono uppercase tracking-wider">
            Enter to send · Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
