"use client";

import { useState } from "react";
import {
  Settings, Bell, Shield, ArrowLeft, Loader2,
  Heart, MessageCircle, UserPlus, Repeat, Mail, TrendingUp,
  Eye, EyeOff, Lock, Users, Globe,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/hooks/useSettings";

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

export default function SettingsPage() {
  const router = useRouter();
  const { authenticated, login } = usePrivy();
  const { settings, isLoading, isSaving, updateNotifications, updatePrivacy } = useSettings();
  const [activeSection, setActiveSection] = useState<"notifications" | "privacy">("notifications");

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
            Manage your preferences
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-[#0a0a0a] border border-zinc-800/60 p-1 animate-fade-up stagger-2">
          {([
            { id: "notifications" as const, label: "Notifications", icon: <Bell className="w-3.5 h-3.5" /> },
            { id: "privacy" as const, label: "Privacy", icon: <Shield className="w-3.5 h-3.5" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                activeSection === tab.id
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 animate-fade-up stagger-3">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shimmer-bg" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 shimmer-bg" />
                      <div className="h-2.5 w-44 shimmer-bg" />
                    </div>
                  </div>
                  <div className="w-11 h-6 shimmer-bg" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Notification Settings */}
            {activeSection === "notifications" && (
              <div className="bg-[#0a0a0a] border border-zinc-800/60 animate-fade-up stagger-3 relative overflow-hidden">
                <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
                <div className="relative z-10">
                  <div className="px-5 py-4 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3.5 bg-white/15" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Notification Preferences
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-2">
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
                </div>
              </div>
            )}

            {/* Privacy Settings */}
            {activeSection === "privacy" && (
              <div className="space-y-4 animate-fade-up stagger-3">
                {/* Visibility */}
                <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="px-5 py-4 border-b border-zinc-800/40">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-white/15" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Profile Visibility
                        </span>
                      </div>
                    </div>

                    <div className="px-5 py-2">
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
                  </div>
                </div>

                {/* Messaging */}
                <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="px-5 py-4 border-b border-zinc-800/40">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-white/15" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Direct Messages
                        </span>
                      </div>
                    </div>

                    <div className="px-5 py-4">
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
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
