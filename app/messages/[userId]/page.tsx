import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { ChatClient } from "./ChatClient";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const decodedId = decodeURIComponent(userId);
  const fallback = {
    title: "Chat — Flarify",
    description: "Direct messages on Flarify",
  };

  try {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", decodedId)
      .single();

    if (!profile) return fallback;

    const name = profile.display_name || profile.username || "User";
    return {
      title: `Chat with ${name} — Flarify`,
      description: `Direct messages with ${name} on Flarify`,
    };
  } catch {
    return fallback;
  }
}

export default function ChatPage() {
  return <ChatClient />;
}
