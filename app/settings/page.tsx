"use client";

import { useState, useCallback } from "react";
import {
  Settings, Bell, Shield, ArrowLeft, Loader2,
  Heart, MessageCircle, UserPlus, Repeat, Mail, TrendingUp,
  Eye, EyeOff, Lock, Users, Globe,
  Copy, Check, LogOut, Trash2, ChevronDown, ChevronRight,
  User, Wallet, Link2, Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/hooks/useSettings";
import { useWallet } from "@/providers/WalletProvider";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTelegramLink } from "@/hooks/useTelegramLink";

/* ── Shared UI ─────────────────────────────────────────── */

function ToggleSwitch({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-none border-2 transition-all duration-300 flex-shrink-0 ${
        enabled
          ? "bg-white border-white"
          : "bg-transparent border-zinc-700 hover:border-zinc-500"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 transition-all duration-300 ${
          enabled
            ? "left-[calc(100%-18px)] bg-black"
            : "left-0.5 bg-zinc-600"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-zinc-800/30 last:border-b-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 border border-zinc-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <ToggleSwitch enabled={enabled} onToggle={onToggle} disabled={disabled} />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  isOpen,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border border-zinc-800/60 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-sm font-black uppercase tracking-widest text-zinc-200">
          {title}
        </span>
      </div>
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      ) : (
        <ChevronRight className="w-4 h-4 text-zinc-500" />
      )}
    </button>
  );
}

function CopyableAddress({ label, address }: { label: string; address: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  if (!address) {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
          <p className="text-sm text-zinc-500 font-mono mt-0.5">Not connected</p>
        </div>
      </div>
    );
  }

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
        <p className="text-sm text-zinc-300 font-mono mt-0.5" title={address}>{truncated}</p>
      </div>
      <button
        onClick={handleCopy}
        className="w-8 h-8 border border-zinc-800/60 flex items-center justify-center hover:border-zinc-600 transition-colors flex-shrink-0"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const { authenticated, user, logout, login } = usePrivy();
  const { settings, isLoading, isSaving, updateNotifications, updatePrivacy } = useSettings();
  const { eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();
  const telegram = useTelegramLink();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    account: true,
    notifications: true,
    privacy: false,
    linked: false,
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await authFetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      await logout();
      router.push("/");
      toast.success("Account deleted");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  /* ── Not authenticated ─── */
  if (!authenticated) {
    return (
      <PageTransition>
        <div className="space-y-5">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 sm:p-12 text-center animate-scale-in corner-accent relative overflow-hidden">
            <div className="absolute inset-0 grid-bg-animated opacity-10" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
                <Settings className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider mb-2">Sign In Required</h3>
              <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
                Sign in to manage your settings
              </p>
              <button
                onClick={login}
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

  /* ── Authenticated ─── */
  const googleEmail = user?.google?.email || user?.email?.address || null;
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          {isSaving && (
            <div className="flex items-center gap-2 text-zinc-600 animate-fade-in">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Saving</span>
            </div>
          )}
        </div>

        <div className="animate-fade-up stagger-1">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Settings
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mt-1">
            Manage your account & preferences
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-fade-up stagger-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-zinc-800/60 p-5">
                <div className="space-y-3">
                  <div className="h-4 w-32 shimmer-bg" />
                  <div className="h-3 w-48 shimmer-bg" />
                  <div className="h-3 w-40 shimmer-bg" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 animate-fade-up stagger-2">

            {/* ═══════ ACCOUNT ═══════ */}
            <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
              <div className="relative z-10">
                <SectionHeader
                  icon={<User className="w-4 h-4 text-zinc-400" />}
                  title="Account"
                  isOpen={openSections.account}
                  onToggle={() => toggleSection("account")}
                />

                {openSections.account && (
                  <div className="border-t border-zinc-800/40">
                    {/* Connected Account */}
                    <div className="px-5 py-4 border-b border-zinc-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3.5 bg-white/15" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Connected Account
                        </span>
                      </div>
                      {googleEmail && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border border-zinc-800/60 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-200">{googleEmail}</p>
                            {memberSince && (
                              <p className="text-[10px] text-zinc-600 font-medium mt-0.5">
                                Member since {memberSince}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wallet Addresses */}
                    <div className="px-5 py-4 border-b border-zinc-800/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-3.5 bg-white/15" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Wallet Addresses
                        </span>
                      </div>
                      <CopyableAddress label="Safe (Trading)" address={safeAddress} />
                      <CopyableAddress label="EOA (Signer)" address={eoaAddress} />
                    </div>

                    {/* Danger Zone */}
                    <div className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-3.5 bg-red-500/30" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Danger Zone
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setShowLogoutModal(true)}
                          className="flex items-center gap-2 px-4 py-2.5 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-xs font-bold uppercase tracking-wider"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Log Out
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="flex items-center gap-2 px-4 py-2.5 border border-red-900/40 text-red-400/70 hover:text-red-400 hover:border-red-800/60 hover:bg-red-500/5 transition-all text-xs font-bold uppercase tracking-wider"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════ NOTIFICATIONS ═══════ */}
            <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
              <div className="relative z-10">
                <SectionHeader
                  icon={<Bell className="w-4 h-4 text-zinc-400" />}
                  title="Notifications"
                  isOpen={openSections.notifications}
                  onToggle={() => toggleSection("notifications")}
                />

                {openSections.notifications && (
                  <div className="border-t border-zinc-800/40 px-5 py-2">
                    <SettingRow
                      icon={<Heart className="w-4 h-4 text-zinc-400" />}
                      label="Likes"
                      description="When someone likes your post"
                      enabled={settings.notifications.likes}
                      onToggle={() => updateNotifications({ likes: !settings.notifications.likes })}
                      disabled={isSaving}
                    />
                    <SettingRow
                      icon={<MessageCircle className="w-4 h-4 text-zinc-400" />}
                      label="Comments"
                      description="When someone comments on your post"
                      enabled={settings.notifications.comments}
                      onToggle={() => updateNotifications({ comments: !settings.notifications.comments })}
                      disabled={isSaving}
                    />
                    <SettingRow
                      icon={<UserPlus className="w-4 h-4 text-zinc-400" />}
                      label="Follows"
                      description="When someone follows you"
                      enabled={settings.notifications.follows}
                      onToggle={() => updateNotifications({ follows: !settings.notifications.follows })}
                      disabled={isSaving}
                    />
                    <SettingRow
                      icon={<Repeat className="w-4 h-4 text-zinc-400" />}
                      label="Reposts"
                      description="When someone reposts your post"
                      enabled={settings.notifications.reposts}
                      onToggle={() => updateNotifications({ reposts: !settings.notifications.reposts })}
                      disabled={isSaving}
                    />
                    <SettingRow
                      icon={<Mail className="w-4 h-4 text-zinc-400" />}
                      label="Messages"
                      description="When you receive a new direct message"
                      enabled={settings.notifications.messages}
                      onToggle={() => updateNotifications({ messages: !settings.notifications.messages })}
                      disabled={isSaving}
                    />
                    <SettingRow
                      icon={<TrendingUp className="w-4 h-4 text-zinc-400" />}
                      label="Price Alerts"
                      description="When a price alert is triggered"
                      enabled={settings.notifications.price_alerts}
                      onToggle={() => updateNotifications({ price_alerts: !settings.notifications.price_alerts })}
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ═══════ PRIVACY ═══════ */}
            <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
              <div className="relative z-10">
                <SectionHeader
                  icon={<Shield className="w-4 h-4 text-zinc-400" />}
                  title="Privacy"
                  isOpen={openSections.privacy}
                  onToggle={() => toggleSection("privacy")}
                />

                {openSections.privacy && (
                  <div className="border-t border-zinc-800/40">
                    {/* Visibility */}
                    <div className="px-5 py-2">
                      <div className="flex items-center gap-2 py-3">
                        <div className="w-1 h-3.5 bg-white/15" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Profile Visibility
                        </span>
                      </div>
                      <SettingRow
                        icon={<TrendingUp className="w-4 h-4 text-zinc-400" />}
                        label="Public PnL"
                        description="Show your profit/loss to other users"
                        enabled={settings.privacy.show_pnl_public}
                        onToggle={() => updatePrivacy({ show_pnl_public: !settings.privacy.show_pnl_public })}
                        disabled={isSaving}
                      />
                      <SettingRow
                        icon={settings.privacy.show_positions_public ? <Eye className="w-4 h-4 text-zinc-400" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
                        label="Public Positions"
                        description="Show your trading positions to other users"
                        enabled={settings.privacy.show_positions_public}
                        onToggle={() => updatePrivacy({ show_positions_public: !settings.privacy.show_positions_public })}
                        disabled={isSaving}
                      />
                    </div>

                    {/* Messaging */}
                    <div className="px-5 py-4 border-t border-zinc-800/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-3.5 bg-white/15" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Direct Messages
                        </span>
                      </div>
                      <p className="text-sm font-bold text-zinc-200 uppercase tracking-wide mb-1">
                        Who can message you
                      </p>
                      <p className="text-[11px] text-zinc-600 font-medium mb-4">
                        Control who can send you direct messages
                      </p>
                      <div className="space-y-2">
                        {([
                          { value: "everyone" as const, label: "Everyone", icon: <Globe className="w-4 h-4" />, desc: "Anyone on Flarify can message you" },
                          { value: "following" as const, label: "People you follow", icon: <Users className="w-4 h-4" />, desc: "Only people you follow" },
                          { value: "nobody" as const, label: "Nobody", icon: <Lock className="w-4 h-4" />, desc: "Disable direct messages" },
                        ]).map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updatePrivacy({ allow_messages_from: option.value })}
                            disabled={isSaving}
                            className={`w-full flex items-center gap-3 p-3 border transition-all duration-200 text-left ${
                              settings.privacy.allow_messages_from === option.value
                                ? "border-white/60 bg-white/[0.04]"
                                : "border-zinc-800/60 hover:border-zinc-700 hover:bg-white/[0.02]"
                            } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <div className={`w-8 h-8 border flex items-center justify-center flex-shrink-0 ${
                              settings.privacy.allow_messages_from === option.value
                                ? "border-white/40 text-white"
                                : "border-zinc-800 text-zinc-600"
                            }`}>
                              {option.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold uppercase tracking-wide ${
                                settings.privacy.allow_messages_from === option.value ? "text-white" : "text-zinc-400"
                              }`}>
                                {option.label}
                              </p>
                              <p className="text-[10px] text-zinc-600 font-medium">{option.desc}</p>
                            </div>
                            {settings.privacy.allow_messages_from === option.value && (
                              <div className="w-2 h-2 bg-white flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════ LINKED ACCOUNTS ═══════ */}
            <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
              <div className="relative z-10">
                <SectionHeader
                  icon={<Link2 className="w-4 h-4 text-zinc-400" />}
                  title="Linked Accounts"
                  isOpen={openSections.linked}
                  onToggle={() => toggleSection("linked")}
                />

                {openSections.linked && (
                  <div className="border-t border-zinc-800/40 px-5 py-4">
                    {/* Telegram */}
                    <div className="border border-zinc-800/60 relative overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 border border-zinc-800/60 flex items-center justify-center flex-shrink-0">
                              <Send className="w-5 h-5 text-[#26A5E4]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-zinc-200 uppercase tracking-wide">
                                Telegram
                              </p>
                              {telegram.isConnected ? (
                                <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                                  Connected as @{telegram.username}
                                </p>
                              ) : (
                                <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                                  Receive market alerts via Telegram
                                </p>
                              )}
                            </div>
                          </div>

                          {telegram.isConnected ? (
                            <button
                              onClick={telegram.disconnect}
                              disabled={telegram.isLoading}
                              className="px-4 py-2 border border-red-900/40 text-red-400/70 hover:text-red-400 hover:border-red-800/60 transition-all text-[10px] font-black uppercase tracking-widest flex-shrink-0 disabled:opacity-50"
                            >
                              Disconnect
                            </button>
                          ) : telegram.isLinking ? (
                            <div className="flex items-center gap-2 text-zinc-500">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                Waiting...
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={telegram.connect}
                              disabled={telegram.isLoading}
                              className="px-4 py-2 bg-white text-black font-black uppercase tracking-widest text-[10px] border-2 border-white hover:bg-black hover:text-white transition-all duration-300 flex-shrink-0 disabled:opacity-50"
                            >
                              Connect
                            </button>
                          )}
                        </div>

                        {telegram.isLinking && telegram.linkUrl && (
                          <div className="mt-4 p-3 border border-zinc-800/40 bg-white/[0.02]">
                            <p className="text-[11px] text-zinc-400 font-medium mb-2">
                              Click the link below to connect your Telegram account:
                            </p>
                            <a
                              href={telegram.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[#26A5E4] hover:text-[#4ab8ef] font-bold transition-colors break-all"
                            >
                              {telegram.linkUrl}
                            </a>
                            <p className="text-[10px] text-zinc-600 font-medium mt-2">
                              Press Start in the bot to complete linking. This page will update automatically.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ DELETE ACCOUNT MODAL ═══════ */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800/60 w-full max-w-md relative overflow-hidden animate-scale-in">
              <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
              <div className="relative z-10 p-6">
                <div className="w-12 h-12 mx-auto mb-4 border-2 border-red-900/40 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-center mb-2">
                  Delete Account
                </h3>
                <p className="text-sm text-zinc-500 text-center mb-6">
                  This action is permanent and cannot be undone. All your data, posts, and positions will be deleted.
                </p>
                <div className="mb-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
                    Type DELETE to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-3 bg-transparent border border-zinc-800 text-white font-mono text-sm focus:outline-none focus:border-red-800/60 placeholder:text-zinc-700"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== "DELETE" || isDeleting}
                    className={`flex-1 py-3 border-2 text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                      deleteConfirmText === "DELETE"
                        ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                        : "border-zinc-800 text-zinc-700 cursor-not-allowed"
                    }`}
                  >
                    {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ═══════ LOGOUT MODAL ═══════ */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800/60 w-full max-w-sm relative overflow-hidden animate-scale-in">
              <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
              <div className="relative z-10 p-6">
                <div className="w-12 h-12 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center">
                  <LogOut className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-center mb-2">
                  Log Out
                </h3>
                <p className="text-sm text-zinc-500 text-center mb-6">
                  Are you sure you want to log out of your account?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-xs font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex-1 py-3 bg-white text-black font-black uppercase tracking-wider text-xs border-2 border-white hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {isLoggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
