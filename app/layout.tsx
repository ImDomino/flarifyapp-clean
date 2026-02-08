import type { Metadata } from "next";
import "./globals.css";
import { NavigationSidebar } from "@/components/Navigation";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
            <div className="pointer-events-none fixed inset-0 z-0">
              <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl"></div>
              <div className="absolute -bottom-56 right-0 h-[520px] w-[520px] rounded-full bg-teal-500/10 blur-3xl"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(59,130,246,.10),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(20,184,166,.10),transparent_45%)]"></div>
              <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:48px_48px]"></div>
            </div>

            <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-5 lg:gap-6">
                {/* Left navigation sidebar */}
                <NavigationSidebar />

                {/* Main content */}
                <main className="min-w-0 pb-24 lg:pb-0">
                  {children}
                </main>

                {/* Right sidebar */}
                <RightSidebar />
              </div>
            </div>

            {/* Mobile bottom navigation */}
            <MobileBottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
