import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();

    // Get all conversations where user is a participant
    // Use separate queries to avoid .or() string interpolation injection
    const { data: convAsUser1 } = await supabase
      .from("conversations")
      .select("*")
      .eq("user1_id", userId);

    const { data: convAsUser2 } = await supabase
      .from("conversations")
      .select("*")
      .eq("user2_id", userId);

    const conversations = [...(convAsUser1 || []), ...(convAsUser2 || [])]
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    const error = null;

    if (error) throw error;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get other user IDs
    const otherUserIds = conversations.map((c) =>
      c.user1_id === userId ? c.user2_id : c.user1_id
    );

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", otherUserIds);

    const profileMap: Record<string, any> = {};
    for (const p of profiles || []) profileMap[p.id] = p;

    // Get unread counts per conversation
    const { data: unreadCounts } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", conversations.map((c) => c.id))
      .neq("sender_id", userId)
      .eq("read", false);

    const unreadMap: Record<string, number> = {};
    for (const m of unreadCounts || []) {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    }

    const enriched = conversations.map((c) => {
      const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
      return {
        ...c,
        other_user: profileMap[otherId] || null,
        unread_count: unreadMap[c.id] || 0,
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (error: any) {
    console.error("Conversations error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
