import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Flarify — Social Network for Prediction Market Traders",
  description: "The first social network for Polymarket predictors",
  openGraph: {
    title: "Flarify — Social Network for Prediction Market Traders",
    description: "The first social network for Polymarket predictors",
    type: "website",
    siteName: "Flarify",
  },
  twitter: {
    card: "summary",
    title: "Flarify — Social Network for Prediction Market Traders",
    description: "The first social network for Polymarket predictors",
  },
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
          <AppShell>{children}</AppShell>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "bg-[#0a0a0a] border border-zinc-800 px-4 py-3 rounded-none flex items-center gap-3 w-full font-body shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
                title:
                  "text-zinc-200 text-[13px] font-bold uppercase tracking-wider",
                description: "text-zinc-500 text-[11px] uppercase tracking-wider mt-0.5",
                success: "border-zinc-700",
                error: "border-red-900/50",
                actionButton:
                  "bg-white text-black text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-zinc-200 transition-colors",
                cancelButton:
                  "bg-transparent text-zinc-500 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border border-zinc-800 hover:text-white hover:border-zinc-600 transition-colors",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
