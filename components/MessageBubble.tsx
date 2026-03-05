"use client";

import { Check, CheckCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import Image from "next/image";

interface MessageBubbleProps {
  content: string | null;
  imageUrl: string | null;
  isSent: boolean;
  read: boolean;
  createdAt: string;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `YST ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
}

export function MessageBubble({ content, imageUrl, isSent, read, createdAt }: MessageBubbleProps) {
  const time = formatTime(createdAt);

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2.5`}>
      <div
        className={`max-w-[75%] sm:max-w-[65%] relative group transition-all duration-200 ${
          isSent
            ? "bg-white text-black hover:shadow-[0_2px_20px_rgba(255,255,255,0.06)]"
            : "bg-[#0e0e0e] border border-zinc-800/70 text-zinc-100 hover:border-zinc-700/70"
        }`}
      >
        {imageUrl && (
          <div className="overflow-hidden">
            <Image
              src={imageUrl}
              alt="Attachment"
              width={320}
              height={220}
              className="w-full max-h-72 object-cover"
              unoptimized
            />
          </div>
        )}
        {content && (
          <p className={`px-4 py-2.5 text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${imageUrl ? "pt-2" : ""}`}>
            {content}
          </p>
        )}
        <div className={`flex items-center gap-1.5 px-4 pb-2 ${
          isSent ? "justify-end" : "justify-start"
        }`}>
          <span className={`text-[9px] font-mono uppercase tracking-wider ${
            isSent ? "text-zinc-400" : "text-zinc-600"
          }`}>
            {time}
          </span>
          {isSent && (
            read ? (
              <CheckCheck className="w-3 h-3 text-zinc-400" />
            ) : (
              <Check className="w-3 h-3 text-zinc-400" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = "Today";
  else if (isYesterday(d)) label = "Yesterday";
  else label = format(d, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-4 my-5">
      <div className="flex-1 h-px bg-zinc-800/40" />
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-700">
        {label}
      </span>
      <div className="flex-1 h-px bg-zinc-800/40" />
    </div>
  );
}
