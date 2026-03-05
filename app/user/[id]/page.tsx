import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { UserProfileClient } from "./UserProfileClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const userId = decodeURIComponent(id);
  const fallback = {
    title: "Profile — Flarify",
    description: "View this profile on Flarify",
  };

  try {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_url")
      .eq("id", userId)
      .single();

    if (!profile) return fallback;

    const displayName = profile.display_name || profile.username || "User";
    const username = profile.username || "user";
    const title = `${displayName} (@${username}) — Flarify`;
    const description = profile.bio || `@${username} on Flarify — Social Network for Prediction Market Traders`;
    const image = profile.avatar_url || undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        siteName: "Flarify",
        ...(image && { images: [{ url: image }] }),
      },
      twitter: {
        card: "summary",
        title,
        description,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return fallback;
  }
}

export default function UserPage() {
  return <UserProfileClient />;
}
