"use client";

import { Check, CheckCheck, Pencil, Trash2, Reply } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import Image from "next/image";

interface ReplyTo {
  id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  deleted_at: string | null;
}

interface MessageBubbleProps {
  content: string | null;
  imageUrl: string | null;
  isSent: boolean;
  read: boolean;
  createdAt: string;
  deletedAt: string | null;
  editedAt: string | null;
  replyTo: ReplyTo | null;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `YST ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
}

export function MessageBubble({
  content, imageUrl, isSent, read, createdAt,
  deletedAt, editedAt, replyTo,
  onReply, onEdit, onDelete,
}: MessageBubbleProps) {
  const time = formatTime(createdAt);

  // Deleted message
  if (deletedAt) {
    return (
      <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-2.5`}>
        <div className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 ${
          isSent ? "opacity-40" : "opacity-30"
        }`}>
          <p className="text-[12px] italic text-zinc-500 font-medium">Message deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${isSent ? "justify-end" : "justify-start"} mb-2.5 group/msg`}>
      {/* Hover actions — beside the bubble: left of sent, right of received */}
      <div className={`hidden group-hover/msg:flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity ${isSent ? "order-first" : "order-last"}`}>
        {onReply && (
          <button onClick={onReply} className="p-1 text-zinc-700 hover:text-white transition-colors" title="Reply">
            <Reply className="w-3.5 h-3.5" />
          </button>
        )}
        {onEdit && (
          <button onClick={onEdit} className="p-1 text-zinc-700 hover:text-white transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1 text-zinc-700 hover:text-red-400 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        className={`max-w-[75%] sm:max-w-[65%] relative transition-all duration-200 ${
          isSent
            ? "bg-white text-black hover:shadow-[0_2px_20px_rgba(255,255,255,0.06)]"
            : "bg-[#0e0e0e] border border-zinc-800/70 text-zinc-100 hover:border-zinc-700/70"
        }`}
      >
        {/* Reply quote */}
        {replyTo && (
          <div className={`mx-3 mt-2.5 px-3 py-2 border-l-2 ${
            isSent ? "border-zinc-300 bg-zinc-100" : "border-zinc-700 bg-zinc-900/80"
          }`}>
            <p className={`text-[11px] line-clamp-2 ${
              isSent ? "text-zinc-500" : "text-zinc-400"
            }`}>
              {replyTo.deleted_at
                ? "Message deleted"
                : replyTo.content || (replyTo.image_url ? "Photo" : "")
              }
            </p>
          </div>
        )}

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
          <p className={`px-4 py-2.5 text-[13px] font-medium leading-relaxed whitespace-pre-wrap ${imageUrl ? "pt-2" : ""} ${replyTo && !imageUrl ? "pt-1.5" : ""}`}>
            {content}
          </p>
        )}
        <div className={`flex items-center gap-1.5 px-4 pb-2 ${
          isSent ? "justify-end" : "justify-start"
        }`}>
          {editedAt && (
            <span className={`text-[9px] font-mono italic ${
              isSent ? "text-zinc-400" : "text-zinc-600"
            }`}>
              edited
            </span>
          )}
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
