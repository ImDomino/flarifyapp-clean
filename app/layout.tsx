import type { Metadata } from "next";
import "./globals.css";
import { TopNavBar } from "@/components/TopNavBar";
import { NavigationSidebar } from "@/components/Navigation";
import { RightSidebar } from "@/components/RightSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Flarify — Social Network for Prediction Market Traders",
  description: "The first social network for Polymarket predictors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body min-h-screen selection:bg-white selection:text-black" suppressHydrationWarning>
        <Providers>
          {/* Structural Background Grid */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 grid-bg opacity-50" />
            {/* Geometric accent lines */}
            <div className="absolute top-0 right-[25%] w-px h-full bg-zinc-900" />
            <div className="absolute top-0 left-[18%] w-px h-full bg-zinc-900" />
            <div className="absolute top-[40%] left-0 w-full h-px bg-zinc-900" />
          </div>

          {/* Top Navigation Bar */}
          <TopNavBar />

          {/* Main Layout Grid */}
          <div className="max-w-[1440px] mx-auto pt-20 px-4 sm:px-6 lg:px-8 grid grid-cols-12 gap-6 lg:gap-8 relative z-10 min-h-screen">
            {/* Left Sidebar */}
            <NavigationSidebar />

            {/* Main Content */}
            <main className="col-span-12 md:col-span-9 lg:col-span-7 pt-6 lg:pt-8 pb-24 lg:pb-20 min-w-0">
              {children}
            </main>

            {/* Right Sidebar */}
            <RightSidebar />
          </div>

          {/* Mobile Bottom Nav */}
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
