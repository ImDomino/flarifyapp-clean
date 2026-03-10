"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  MessageCircle, Search, Plus, X, Shield, Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageTransition } from "@/components/PageTransition";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  other_user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  unread_count: number;
}

interface UserResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, authenticated, login } = usePrivy();
  const authFetch = useAuthFetch();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authFetch("/api/messages/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Load conversations error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, authFetch]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Search users for new chat
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=users`);
        const data = await res.json();
        setSearchResults(
          (data.users || []).filter((u: UserResult) => u.id !== user?.id)
        );
      } catch {}
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  // Not authenticated
  if (!authenticated) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="animate-fade-up stagger-1">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Messages</h1>
          </div>
          <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 sm:p-12 text-center animate-scale-in corner-accent relative overflow-hidden">
            <div className="absolute inset-0 grid-bg-animated opacity-10" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
                <Shield className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2">Sign In Required</h3>
              <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
                Sign in to view your messages
              </p>
              <button
                onClick={() => login()}
                className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-up stagger-1">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight">Messages</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1">
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`
                : "Direct Messages"
              }
            </p>
          </div>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className={`w-10 h-10 border-2 flex items-center justify-center transition-all duration-300 ${
              showNewChat
                ? "border-white bg-white text-black rotate-45"
                : "border-zinc-700 text-zinc-400 hover:border-white hover:text-white"
            }`}
          >
            <Plus className={`w-4 h-4 transition-transform duration-300 ${showNewChat ? "-rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* New Chat Panel */}
      {showNewChat && (
        <div className="bg-[#0a0a0a] border border-zinc-800/70 animate-scale-in corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
          <div className="relative z-10">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/40">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3.5 bg-white/15" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  New Conversation
                </span>
              </div>
              <button
                onClick={() => { setShowNewChat(false); setSearchQuery(""); setSearchResults([]); }}
                className="p-1 text-zinc-600 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  autoFocus
                  className="w-full bg-[#111] border border-zinc-800/80 pl-10 pr-4 py-3 text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border-t border-zinc-800/30">
                {searchResults.map((u, i) => (
                  <button
                    key={u.id}
                    onClick={() => router.push(`/messages/${encodeURIComponent(u.id)}`)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-all duration-200 text-left group"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="w-10 h-10 border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-zinc-500 transition-colors">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-white uppercase">
                          {(u.display_name || u.username || "U")[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white uppercase tracking-wide truncate group-hover:text-white transition-colors">
                        {u.display_name || u.username}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-bold">@{u.username}</div>
                    </div>
                    <Send className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="flex justify-center py-4 border-t border-zinc-800/30">
                <div className="geo-spinner" />
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-6 border-t border-zinc-800/30">
                <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-wider">No users found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#0a0a0a] border border-zinc-800/40 p-5 flex items-center gap-4" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-12 h-12 shimmer-bg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 shimmer-bg w-32" />
                <div className="h-2.5 shimmer-bg w-48" />
              </div>
              <div className="h-2 shimmer-bg w-12" />
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 sm:p-16 text-center animate-scale-in corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          {/* Decorative corners */}
          <div className="absolute top-0 right-0 w-32 h-32 border-r border-t border-zinc-800/50 opacity-40" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-l border-b border-zinc-800/50 opacity-30" />

          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
              <MessageCircle className="w-10 h-10 text-zinc-500" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider mb-2 animate-fade-up stagger-2">
              No Messages Yet
            </h3>
            <p className="text-sm text-zinc-500 uppercase tracking-wide mb-8 animate-fade-up stagger-3">
              Start a conversation with someone on Flarify
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-10 py-3.5 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-all duration-300 animate-fade-up stagger-4"
            >
              Start a Conversation
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 animate-fade-up stagger-2">
          {conversations.map((conv, i) => {
            const other = conv.other_user;
            const name = other?.display_name || other?.username || "User";
            const time = formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false });
            const hasUnread = conv.unread_count > 0;

            return (
              <button
                key={conv.id}
                onClick={() => {
                  const otherId = conv.user1_id === user?.id ? conv.user2_id : conv.user1_id;
                  router.push(`/messages/${encodeURIComponent(otherId)}`);
                }}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-5 bg-[#0a0a0a] border border-zinc-800/60 hover:bg-[#0d0d0d] hover:border-zinc-700/60 transition-all duration-300 text-left group relative overflow-hidden ${
                  hasUnread ? "border-l-2 border-l-white" : ""
                }`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* Unread glow */}
                {hasUnread && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
                )}

                {/* Avatar */}
                <div className={`w-12 h-12 flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:border-zinc-500 ${
                  hasUnread ? "border-2 border-white/30" : "border border-zinc-700"
                }`}>
                  {other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-white uppercase">{name[0]}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-black uppercase tracking-wide truncate ${
                      hasUnread ? "text-white" : "text-zinc-300"
                    }`}>
                      {name}
                    </span>
                    <span className="text-[10px] text-zinc-700 font-mono uppercase tracking-wider flex-shrink-0 ml-3">
                      {time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-xs truncate ${
                      hasUnread ? "text-zinc-300 font-bold" : "text-zinc-600 font-medium"
                    }`}>
                      {conv.last_message_preview || "Start chatting..."}
                    </p>
                    {hasUnread && (
                      <span className="min-w-[22px] h-[22px] flex items-center justify-center bg-white text-black text-[10px] font-black px-1.5 flex-shrink-0 animate-scale-in">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
