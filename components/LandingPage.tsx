"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useBetaGate } from "@/providers/BetaGateProvider";
import { ArrowRight, Mail, Ticket } from "lucide-react";

export function LandingPage() {
  const { login, authenticated } = usePrivy();
  const { pendingInviteCode } = useBetaGate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Invite code indicator */}
        {pendingInviteCode && (
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-500/30 bg-emerald-500/5 mb-8 animate-fade-up stagger-4">
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Invite code: {pendingInviteCode}
            </span>
          </div>
        )}

        {/* Sign in */}
        <div className="mb-12 animate-fade-up stagger-5">
          {pendingInviteCode ? (
            <button
              onClick={login}
              className="px-10 py-4 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]"
            >
              Sign In to Join
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          ) : authenticated ? (
            <div className="bg-[#0a0a0a] border border-zinc-800/60 p-6 max-w-md mx-auto">
              <p className="text-sm text-zinc-400 uppercase tracking-wider font-bold mb-2">
                Your account is pending approval
              </p>
              <p className="text-xs text-zinc-600">
                Join the waitlist below or use an invite code to get early access.
              </p>
            </div>
          ) : (
            <button
              onClick={login}
              className="px-10 py-4 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300"
            >
              Sign In with Invite Code
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-sm mx-auto mb-12 animate-fade-up stagger-6">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">
            Or Join Waitlist
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* Waitlist form */}
        <div className="max-w-md mx-auto animate-fade-up stagger-7">
          {submitted ? (
            <div className="bg-[#0a0a0a] border border-emerald-500/30 p-6">
              <p className="text-emerald-400 font-black uppercase tracking-wider text-sm mb-1">
                You are on the list
              </p>
              <p className="text-xs text-zinc-500">
                We will notify you when a spot opens up.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="YOUR EMAIL"
                  required
                  className="w-full bg-[#0a0a0a] border border-zinc-800/60 py-4 pl-12 pr-4 text-sm font-bold uppercase tracking-wider text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-all duration-200"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-4 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Join"}
              </button>
            </form>
          )}
          {error && (
            <p className="mt-2 text-xs text-red-400 uppercase tracking-wider font-bold">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
