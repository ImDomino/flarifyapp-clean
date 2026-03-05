import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { PostDetailClient } from "./PostDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const fallback = {
    title: "Post — Flarify",
    description: "View this post on Flarify",
  };

  try {
    const supabase = createServiceClient();
    const { data: post } = await supabase
      .from("posts")
      .select("content, image_url, polymarket_market_id, market_data, profiles(username, display_name, avatar_url)")
      .eq("id", id)
      .single();

    if (!post) return fallback;

    const profile = post.profiles as any;
    const displayName = profile?.display_name || profile?.username || "Someone";
    const username = profile?.username || "user";
    const content = post.content || "";
    const title = content.length > 70 ? content.slice(0, 67) + "..." : content || `Post by ${displayName}`;
    const description = `@${username} on Flarify`;
    const image = post.image_url || profile?.avatar_url || undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "Flarify",
        ...(image && { images: [{ url: image }] }),
      },
      twitter: {
        card: post.image_url ? "summary_large_image" : "summary",
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return fallback;
  }
}

export default function PostPage() {
  return <PostDetailClient />;
}
