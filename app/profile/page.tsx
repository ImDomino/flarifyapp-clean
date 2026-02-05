"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { 
  MessageCircle, 
  Heart, 
  TrendingUp, 
  Shield, 
  Fingerprint, 
  Copy, 
  BadgeCheck,
  LayoutTemplate,
  AtSign,
  Hash,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
  Plus,
  Minus,
  ExternalLink,
  Info,
  UserPlus,
  Send
} from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { PositionsTab } from "@/components/PositionsTab";
import type { PostWithUser } from "@/lib/types";

export default function ProfilePage() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'positions' | 'activity'>('positions');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (user) {
      loadUserPosts();
    }
  }, [authenticated, user]);

  const loadUserPosts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts?page=1&limit=100`);
      const data = await response.json();

      const userPosts = data.posts.filter((post: PostWithUser) => post.user_id === user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText("0x01fc...815d");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authenticated) {
    return (
      <div className="text-center py-12">
        <div className="rounded-xl bg-base-900/70 border border-white/5 shadow-card p-8">
          <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-blue-300" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-4">
            Sign in to View Profile
          </h1>
          <p className="text-slate-400 mb-6">
            You need to be signed in to view your profile
          </p>
          <button
            onClick={login}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const username = user?.google?.name || user?.email?.address?.split('@')[0] || 'User';
  const email = user?.google?.email || user?.email?.address || '';
  const walletAddress = user?.wallet?.address || '0x01fc...815d';
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '0x01fc...815d';

  return (
    <div className="space-y-5">
      {/* Header / Cover Section */}
      <section className="rounded-xl bg-base-900/60 border border-white/5 shadow-card overflow-hidden">
        <div className="relative">
          {/* Cover gradient */}
          <div className="h-44 sm:h-48 lg:h-52 bg-gradient-to-r from-[#111a3b] via-[#1a2a57] to-[#0d3a3a]"></div>
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(20,184,166,.28),transparent_55%)]"></div>
          
          {/* Avatar */}
          <div className="absolute -bottom-10 left-6 flex items-end gap-5">
            <div className="relative">
              <div className="h-[125px] w-[125px] rounded-full bg-gradient-to-br from-blue-500 to-teal-400 p-[3px] shadow-glow">
                <div className="h-full w-full rounded-full bg-base-900 flex items-center justify-center overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-br from-blue-500/30 to-teal-400/25 flex items-center justify-center">
                    <span className="font-display text-4xl font-bold text-blue-100">
                      {username[0].toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-base-900 border border-white/10 flex items-center justify-center shadow-soft">
                <BadgeCheck className="text-lg text-blue-300" />
              </div>
            </div>
          </div>

          {/* Action buttons (desktop) */}
          <div className="absolute bottom-4 right-5 hidden sm:flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold bg-white/5 hover:bg-white/8 border border-white/10 text-slate-200 transition">
              <UserPlus className="w-4 h-4 text-slate-300" />
              Follow
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500/90 to-teal-400/90 text-slate-950 hover:from-blue-500 hover:to-teal-400 transition shadow-glow">
              <Send className="w-4 h-4" />
              Message
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 pt-14 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">{username}</h1>
              <div className="mt-1 text-sm text-slate-400 truncate">{email}</div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {/* Role badge */}
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <Shield className="w-4 h-4 text-teal-200" />
                  <span className="text-xs font-semibold text-slate-200">Prediction market enthusiast</span>
                </div>

                {/* Wallet address */}
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-200" />
                  <span className="text-xs text-slate-300">{shortWallet}</span>
                  <button 
                    onClick={handleCopyAddress}
                    className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-200 hover:text-blue-100 hover:bg-blue-500/10 transition"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Mobile action buttons */}
                <div className="sm:hidden flex items-center gap-2">
                  <button className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold bg-white/5 hover:bg-white/8 border border-white/10 text-slate-200 transition min-h-[44px]">
                    Follow
                  </button>
                  <button className="inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500/90 to-teal-400/90 text-slate-950 hover:from-blue-500 hover:to-teal-400 transition shadow-glow min-h-[44px]">
                    Message
                  </button>
                </div>
              </div>
            </div>

            {/* Total Posts Card */}
            <div className="w-full md:w-auto">
              <div className="rounded-xl border border-white/10 bg-base-850/60 p-4 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/15 to-teal-500/15 border border-white/10 flex items-center justify-center">
                    <LayoutTemplate className="text-lg text-blue-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Total Posts</div>
                    <div className="mt-0.5 font-display text-2xl font-semibold tracking-tight">{posts.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <MessageCircle className="text-xl text-blue-300" />
            </div>
            <div className="text-xs text-slate-500">Last 30 days</div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-semibold tracking-tight">{posts.length}</div>
            <div className="mt-0.5 text-sm text-slate-400">Posts</div>
          </div>
        </div>

        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Heart className="text-xl text-rose-300" />
            </div>
            <div className="text-xs text-slate-500">Community</div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-semibold tracking-tight">—</div>
            <div className="mt-0.5 text-sm text-slate-400">Followers</div>
          </div>
        </div>

        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <TrendingUp className="text-xl text-teal-200" />
            </div>
            <div className="text-xs text-slate-500">Network</div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-semibold tracking-tight">—</div>
            <div className="mt-0.5 text-sm text-slate-400">Following</div>
          </div>
        </div>
      </section>

      {/* Bio + Quick Info */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bio Card */}
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">Bio</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
              Active trader
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Focused on prediction markets, clean risk sizing, and sharing trade rationale. I track long-term trend questions and short-term catalysts with transparent updates.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="text-xs text-slate-500">Primary market</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">Politics & Tech</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="text-xs text-slate-500">Risk profile</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">Moderate</div>
            </div>
          </div>
        </div>

        {/* Quick Info Card */}
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Quick info</h2>
          <div className="mt-4 space-y-3">
            {/* Handle */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <AtSign className="text-lg text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Handle</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">
                    @{username.toLowerCase().replace(/\s+/g, "")}
                  </div>
                </div>
              </div>
              <button className="text-xs font-semibold text-blue-300 hover:text-blue-200 transition">
                Edit
              </button>
            </div>

            {/* User ID */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="text-lg text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">User ID</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">flr_1f0c_815d</div>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition">
                <Copy className="w-3 h-3 text-slate-300" />
                Copy
              </button>
            </div>

            {/* Member since */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="text-lg text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Member since</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">Jan 2026</div>
                </div>
              </div>
              <span className="text-xs text-slate-500">UTC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs + Content */}
      <section className="rounded-xl bg-base-900/60 border border-white/5 shadow-card overflow-hidden">
        {/* Tab Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3 sm:px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-base-850/70 border border-white/5 p-1">
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                  activeTab === 'posts'
                    ? 'text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('positions')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                  activeTab === 'positions'
                    ? 'text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                Positions
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
                  activeTab === 'activity'
                    ? 'text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                Activity
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition">
              <Filter className="w-4 h-4 text-slate-300" />
              Filters
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition">
              <RefreshCw className="w-4 h-4 text-slate-300" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5">
          {activeTab === 'positions' && <PositionsContent />}
          {activeTab === 'posts' && <PostsContent posts={posts} isLoading={isLoading} />}
          {activeTab === 'activity' && <ActivityContent />}
        </div>
      </section>
    </div>
  );
}

// Positions Content Component
function PositionsContent() {
  // Placeholder position data matching the design
  const position = {
    question: "Will Polymarket mindshare hit 80%?",
    outcome: "Yes",
    avgPrice: 0.2,
    assetId: "2259614466...",
    expires: "Mar 2026",
    size: 5.23,
    currentValue: 1.07,
    pnl: -0.03,
    pnlPercent: -2.4,
    fillProgress: 78,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">Open Positions</h3>
          <p className="mt-1 text-sm text-slate-400">1 position</p>
        </div>
        <button className="hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition">
          <Sparkles className="w-4 h-4 text-teal-200" />
          Optimize
        </button>
      </div>

      {/* Position Card */}
      <article className="mt-4 rounded-xl border border-white/10 bg-base-850/45 p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4">
          {/* Position Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-100">
                  {position.question}
                </h4>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/15 text-teal-200 border border-teal-500/20 px-2.5 py-1 text-xs font-semibold">
                  <ArrowUpRight className="w-3 h-3" />
                  {position.outcome}
                </span>
                <span className="text-xs text-slate-500">{position.avgPrice}¢ avg</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Asset: {position.assetId}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Expires: {position.expires}
                </span>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition">
              <MoreHorizontal className="text-lg text-slate-300" />
            </button>
          </div>

          {/* Position Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-base-900/35 p-3">
              <div className="text-xs text-slate-500">Size</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">{position.size} shares</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-base-900/35 p-3">
              <div className="text-xs text-slate-500">Current Value</div>
              <div className="mt-1 text-sm font-semibold text-slate-200">${position.currentValue.toFixed(2)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-base-900/35 p-3">
              <div className="text-xs text-slate-500">PnL</div>
              <div className="mt-1 text-sm font-semibold text-rose-300">
                ${position.pnl.toFixed(2)} <span className="text-xs text-slate-500">({position.pnlPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Fill Progress */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Fill progress</span>
              <span>{position.fillProgress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-teal-400" 
                style={{ width: `${position.fillProgress}%` }}
              ></div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-500/90 to-teal-400/90 text-slate-950 hover:from-blue-500 hover:to-teal-400 transition shadow-glow min-h-[44px]">
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition min-h-[44px]">
                <Minus className="w-4 h-4 text-slate-300" />
                Reduce
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold bg-white/0 hover:bg-white/5 border border-white/10 text-slate-200 transition min-h-[44px]">
                <ExternalLink className="w-4 h-4 text-slate-300" />
                View market
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Tip Box */}
      <div className="mt-4 rounded-lg border border-white/10 bg-base-850/35 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-start gap-2">
            <Info className="text-lg text-slate-400 mt-0.5" />
            <p className="text-sm text-slate-300">
              Tip: Keep position sizing consistent. Use notes on each trade so your future self can audit decisions.
            </p>
          </div>
          <button className="text-sm font-semibold text-blue-300 hover:text-blue-200 transition">
            Add note
          </button>
        </div>
      </div>
    </div>
  );
}

// Posts Content Component
function PostsContent({ posts, isLoading }: { posts: PostWithUser[]; isLoading: boolean }) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-blue-300" />
        </div>
        <p className="text-slate-400 mb-4">
          You haven't created any posts yet
        </p>
        <button
          onClick={() => router.push('/create')}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
        >
          Create Your First Post
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// Activity Content Component
function ActivityContent() {
  return (
    <div className="text-center py-12">
      <Heart className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50" />
      <p className="text-slate-400">Activity feed coming soon...</p>
    </div>
  );
}

