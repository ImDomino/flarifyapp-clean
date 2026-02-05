import type { Metadata } from "next";
import "./globals.css";
import { NavigationSidebar } from "@/components/Navigation";
import { RightSidebar } from "@/components/RightSidebar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Flarify — Prediction Market Social",
  description: "The social network for Polymarket predictors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body" suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen bg-base-950 text-slate-100">
            {/* Background atmosphere */}
            <div className="pointer-events-none fixed inset-0">
              <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl"></div>
              <div className="absolute -bottom-56 right-0 h-[520px] w-[520px] rounded-full bg-teal-500/10 blur-3xl"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(59,130,246,.10),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(20,184,166,.10),transparent_45%)]"></div>
              <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:48px_48px]"></div>
            </div>

            <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-5 lg:gap-6">
                {/* Left navigation sidebar */}
                <NavigationSidebar />

                {/* Main content */}
                <main className="min-w-0">
                  {children}
                </main>

                {/* Right sidebar */}
                <RightSidebar />
              </div>

              {/* Mobile bottom quick actions */}
              <div className="lg:hidden mt-6">
                <div className="rounded-xl bg-base-900/70 border border-white/5 shadow-soft p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Trading Balance</div>
                      <div className="mt-1 font-display text-2xl font-semibold tracking-tight">$0.87</div>
                    </div>
                    <a href="#" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow min-h-[44px]">
                      Deposit
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}