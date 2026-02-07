"use client";

import { Settings, Bell, Shield, Palette, Globe, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ComingSoon } from "@/components/ComingSoon";

export default function SettingsPage() {
  const router = useRouter();

  const sections = [
    {
      icon: <Bell className="w-5 h-5 text-blue-300" />,
      title: "Notification Preferences",
      description: "Control which notifications you receive",
    },
    {
      icon: <Shield className="w-5 h-5 text-teal-300" />,
      title: "Privacy & Security",
      description: "Manage your privacy settings and account security",
    },
    {
      icon: <Palette className="w-5 h-5 text-purple-300" />,
      title: "Appearance",
      description: "Customize the look and feel of Flarify",
    },
    {
      icon: <Globe className="w-5 h-5 text-amber-300" />,
      title: "Language & Region",
      description: "Set your language and regional preferences",
    },
  ];

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account preferences</p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-base font-semibold text-slate-200">
                  {section.title}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-xs font-medium text-blue-300">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
