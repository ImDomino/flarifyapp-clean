import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "sonner";

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
          <AppShell>{children}</AppShell>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0a0a0a",
                border: "1px solid rgba(63, 63, 70, 0.5)",
                color: "#e4e4e7",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
