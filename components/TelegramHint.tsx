"use client";

import { useState, useEffect } from "react";
import { Send, X } from "lucide-react";
import Link from "next/link";
import { useTelegramLink } from "@/hooks/useTelegramLink";

const STORAGE_KEY = "tg_hint_hidden";

export function TelegramHint() {
  const { isConnected, isLoading } = useTelegramLink();
  const [dismissed, setDismissed] = useState(true); // hidden by default until checked

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (isLoading || isConnected || dismissed) return null;

  const dismissSession = () => setDismissed(true);

  const dismissForever = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden animate-fade-up">
      <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
      <div className="relative z-10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-[#26A5E4]/30 bg-[#26A5E4]/5 flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4 text-[#26A5E4]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-300 font-bold">
              Get instant alerts in Telegram
            </p>
            <p className="text-[10px] text-zinc-600 font-medium mt-0.5">
              Market alerts and notifications straight to your phone
            </p>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 bg-white/[0.06] border border-zinc-800/60 hover:border-zinc-600 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-all flex-shrink-0"
          >
            Connect
          </Link>
          <button
            onClick={dismissSession}
            className="w-6 h-6 flex items-center justify-center text-zinc-700 hover:text-zinc-400 transition-colors flex-shrink-0"
            title="Hide for now"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={dismissForever}
          className="text-[10px] text-zinc-700 hover:text-zinc-500 font-medium mt-2 ml-11 transition-colors"
        >
          Don't show again
        </button>
      </div>
    </div>
  );
}
