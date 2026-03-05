import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();

    // Get all conversation IDs where user is a participant
    const { data: convAsUser1 } = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", userId);

    const { data: convAsUser2 } = await supabase
      .from("conversations")
      .select("id")
      .eq("user2_id", userId);

    const conversations = [...(convAsUser1 || []), ...(convAsUser2 || [])];

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ unread_count: 0 });
    }

    const convIds = conversations.map((c) => c.id);

    // Count unread messages not sent by user
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .eq("read", false);

    return NextResponse.json({ unread_count: count || 0 });
  } catch (error: any) {
    console.error("Unread count error:", error);
    return NextResponse.json({ unread_count: 0 });
  }
}
