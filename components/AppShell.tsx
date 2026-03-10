"use client";

import { useBetaGate } from "@/providers/BetaGateProvider";
import { usePrivy } from "@privy-io/react-auth";
import { usePathname } from "next/navigation";
import { TopNavBar } from "@/components/TopNavBar";
import { NavigationSidebar } from "@/components/Navigation";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { LandingPage } from "@/components/LandingPage";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isApproved, isLoading } = useBetaGate();
  const { ready } = usePrivy();
  const pathname = usePathname();
  const isMessagesPage = pathname?.startsWith("/messages");

  // Loading state
  if (!ready || isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="geo-spinner mx-auto mb-4" />
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-bold">
            Loading
          </span>
        </div>
      </div>
    );
  }

  // Not approved — show landing page
  if (!isApproved) {
    return <LandingPage />;
  }

  // Approved — full app chrome
  return (
    <>
      {/* Structural Background Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 right-[25%] w-px h-full bg-zinc-900" />
        <div className="absolute top-0 left-[18%] w-px h-full bg-zinc-900" />
        <div className="absolute top-[40%] left-0 w-full h-px bg-zinc-900" />
      </div>

      <TopNavBar />

      <div className="max-w-[1440px] mx-auto pt-16 sm:pt-20 px-3 sm:px-6 lg:px-8 grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 relative z-10 min-h-screen">
        <NavigationSidebar />
        <main className={`col-span-12 md:col-span-9 ${isMessagesPage ? "lg:col-span-10" : "lg:col-span-7"} pt-4 sm:pt-6 lg:pt-8 pb-28 sm:pb-24 lg:pb-20 min-w-0`}>
          {children}
        </main>
        {!isMessagesPage && <RightSidebar />}
      </div>

      <MobileBottomNav />
    </>
  );
}
