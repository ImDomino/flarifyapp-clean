"use client";

import { Construction } from "lucide-react";

interface ComingSoonProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}

export function ComingSoon({
  icon,
  title = "Coming Soon",
  description = "We're working on this feature. Stay tuned!",
}: ComingSoonProps) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/15 to-teal-500/15 border border-white/10 flex items-center justify-center">
        {icon || <Construction className="w-8 h-8 text-blue-300" />}
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-slate-200 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">{description}</p>
    </div>
  );
}
