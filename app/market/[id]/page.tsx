import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { MarketPageClient } from "./MarketPageClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fallback = {
    title: "Market — Flarify",
    description: "View market discussion on Flarify",
  };

  try {
    const supabase = createServiceClient();
    const { data: post } = await supabase
      .from("posts")
      .select("market_data")
      .eq("polymarket_market_id", id)
      .not("market_data", "is", null)
      .limit(1)
      .single();

    if (!post?.market_data) return fallback;

    const market = post.market_data as any;
    const title = market.question || "Market Discussion";
    const outcomes = market.outcomes?.join(" vs ") || "";
    const volume = market.volume ? `$${Number(market.volume).toLocaleString()} volume` : "";
    const description = [outcomes, volume].filter(Boolean).join(" · ") + " — Flarify";

    return {
      title: `${title} — Flarify`,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "Flarify",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return fallback;
  }
}

export default function MarketPage() {
  return <MarketPageClient />;
}
