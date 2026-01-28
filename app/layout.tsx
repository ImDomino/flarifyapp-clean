import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Flarifyapp - Social Prediction Market",
  description: "The social network for Polymarket predictors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main className="max-w-[810px] mx-auto py-8 px-4">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
