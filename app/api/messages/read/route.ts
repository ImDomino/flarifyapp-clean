import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { conversation_id } = await request.json();
    if (!conversation_id || typeof conversation_id !== "string") {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversation_id)) {
      return NextResponse.json({ error: "Invalid conversation_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is in conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id")
      .eq("id", conversation_id)
      .single();

    if (!conv || (conv.user1_id !== userId && conv.user2_id !== userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Mark all messages from the other user as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversation_id)
      .neq("sender_id", userId)
      .eq("read", false);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Messages read error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
