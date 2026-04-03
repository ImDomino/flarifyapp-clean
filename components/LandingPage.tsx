"use client";

import { usePrivy } from "@privy-io/react-auth";
import { ArrowRight } from "lucide-react";

export function LandingPage() {
  const { login } = usePrivy();

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 right-[25%] w-px h-full bg-zinc-900" />
        <div className="absolute top-0 left-[18%] w-px h-full bg-zinc-900" />
        <div className="absolute top-[40%] left-0 w-full h-px bg-zinc-900" />
      </div>

      {/* Top bar */}
      <nav className="relative z-10 h-20 flex items-center px-6 lg:px-8 border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-white flex items-center justify-center bg-black overflow-hidden">
            <img src="/logo/twitter.PNG" alt="Flarify" width={32} height={32} className="object-contain" />
          </div>
          <span className="text-2xl font-black text-white uppercase tracking-tight">
            Flarify
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 lg:pt-32 pb-20 text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-6">
          <span className="block animate-fade-up stagger-1">The Signal</span>
          <span className="block text-zinc-600 animate-fade-up stagger-2">In The</span>
          <span className="block animate-fade-up stagger-3">Noise</span>
        </h1>

        <p className="text-zinc-500 uppercase tracking-widest text-xs sm:text-sm font-bold max-w-md mx-auto mb-12 animate-fade-up stagger-4">
          The first social network for Polymarket predictors.
          Share ideas, discover perspectives, trade insights.
        </p>

        {/* Sign in */}
        <div className="mb-12 animate-fade-up stagger-5">
          <button
            onClick={login}
            className="px-10 py-4 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]"
          >
            Sign In
            <ArrowRight className="w-4 h-4 inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
