"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Users, FileText, BarChart3, ArrowRight, X } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";

type Tab = "all" | "posts" | "users" | "markets";

interface UserResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface MarketResult {
  market_id: string;
  question: string;
  url: string;
  outcomes: string[];
  post_count: number;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [users, setUsers] = useState<UserResult[]>([]);
  const [markets, setMarkets] = useState<MarketResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (q: string, tab: Tab) => {
    if (q.length < 2) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${tab}&limit=20`);
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
      if (data.users) setUsers(data.users);
      if (data.markets) setMarkets(data.markets);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setPosts([]);
      setUsers([]);
      setMarkets([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query, activeTab);
      // Update URL without navigation
      window.history.replaceState(null, "", `/search?q=${encodeURIComponent(query)}`);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeTab, doSearch]);

  // Search on initial load if query param exists
  useEffect(() => {
    if (initialQuery.length >= 2) {
      doSearch(initialQuery, activeTab);
    }
    inputRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "all", label: "All", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "posts", label: "Posts", icon: <FileText className="w-3.5 h-3.5" />, count: posts.length },
    { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" />, count: users.length },
    { id: "markets", label: "Markets", icon: <BarChart3 className="w-3.5 h-3.5" />, count: markets.length },
  ];

  const showPosts = activeTab === "all" || activeTab === "posts";
  const showUsers = activeTab === "all" || activeTab === "users";
  const showMarkets = activeTab === "all" || activeTab === "markets";

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, users, markets..."
          className="w-full bg-[#0a0a0a] border border-zinc-800 text-white text-sm font-medium pl-12 pr-10 py-4 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      {hasSearched && (
        <div className="flex gap-1 border-b border-zinc-800 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "text-white border-white"
                  : "text-zinc-600 border-transparent hover:text-zinc-400"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id !== "all" && tab.count !== undefined && hasSearched && (
                <span className="text-zinc-700">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && (
        <div className="space-y-8">
          {/* Users */}
          {showUsers && users.length > 0 && (
            <div>
              {activeTab === "all" && (
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 pb-2 border-b border-zinc-800/50">
                  Users ({users.length})
                </h3>
              )}
              <div className="space-y-2">
                {users.map((u) => {
                  const name = u.display_name || u.username || "User";
                  return (
                    <button
                      key={u.id}
                      onClick={() => router.push(`/user/${u.id}`)}
                      className="w-full text-left bg-[#0a0a0a] border border-zinc-800 p-4 flex items-center gap-3 hover:bg-[#0d0d0d] hover:border-zinc-700/60 transition-colors group"
                    >
                      <div className="w-10 h-10 flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-white uppercase">{name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase truncate">{name}</p>
                        {u.username && u.display_name && (
                          <p className="text-[10px] text-zinc-600 font-mono">@{u.username}</p>
                        )}
                        {u.bio && (
                          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{u.bio}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Markets */}
          {showMarkets && markets.length > 0 && (
            <div>
              {activeTab === "all" && (
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 pb-2 border-b border-zinc-800/50">
                  Markets ({markets.length})
                </h3>
              )}
              <div className="space-y-2">
                {markets.map((m) => (
                  <button
                    key={m.market_id}
                    onClick={() => router.push(`/market/${m.market_id}`)}
                    className="w-full text-left bg-[#0a0a0a] border border-zinc-800 p-4 hover:bg-[#0d0d0d] hover:border-zinc-700/60 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                            Prediction Market
                          </span>
                        </div>
                        <p className="text-sm font-bold text-white leading-relaxed">{m.question}</p>
                        <p className="text-[10px] text-zinc-600 font-mono mt-1.5 uppercase">
                          {m.post_count} {m.post_count === 1 ? "post" : "posts"} discussing this market
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          {showPosts && posts.length > 0 && (
            <div>
              {activeTab === "all" && (
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 pb-2 border-b border-zinc-800/50">
                  Posts ({posts.length})
                </h3>
              )}
              <div className="space-y-4">
                {posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!isLoading && posts.length === 0 && users.length === 0 && markets.length === 0 && (
            <div className="bg-[#0a0a0a] border border-zinc-800 p-12 text-center">
              <Search className="w-6 h-6 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm font-black uppercase tracking-wider text-zinc-500 mb-1">No results</p>
              <p className="text-xs text-zinc-700">Try a different search term</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-16">
          <Search className="w-8 h-8 mx-auto mb-4 text-zinc-800" />
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">
            Search for posts, users, or prediction markets
          </p>
        </div>
      )}
    </div>
  );
}