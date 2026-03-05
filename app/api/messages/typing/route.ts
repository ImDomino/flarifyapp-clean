import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

// In-memory typing status (resets on server restart, which is fine)
const typingStatus = new Map<string, { userId: string; timestamp: number }>();

const TYPING_TTL = 3000; // 3 seconds

function cleanOldEntries() {
  const now = Date.now();
  for (const [key, value] of typingStatus) {
    if (now - value.timestamp > TYPING_TTL) {
      typingStatus.delete(key);
    }
  }
}

// Validate UUID format
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Verify user belongs to conversation
async function verifyMembership(conversationId: string, userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("user1_id, user2_id")
    .eq("id", conversationId)
    .single();
  if (!conv) return false;
  return conv.user1_id === userId || conv.user2_id === userId;
}

// POST: set typing status
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { conversation_id } = await request.json();
    if (!conversation_id || typeof conversation_id !== "string" || !isValidUUID(conversation_id)) {
      return NextResponse.json({ error: "Valid conversation_id required" }, { status: 400 });
    }

    // Verify user is part of this conversation
    if (!(await verifyMembership(conversation_id, userId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const key = `${conversation_id}:${userId}`;
    typingStatus.set(key, { userId, timestamp: Date.now() });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET: check if someone is typing
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");
    if (!conversationId || !isValidUUID(conversationId)) {
      return NextResponse.json({ error: "Valid conversation_id required" }, { status: 400 });
    }

    // Verify user is part of this conversation
    if (!(await verifyMembership(conversationId, userId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    cleanOldEntries();

    // Check if the other person is typing
    const now = Date.now();
    let isTyping = false;

    for (const [key, value] of typingStatus) {
      if (key.startsWith(`${conversationId}:`) && value.userId !== userId) {
        if (now - value.timestamp <= TYPING_TTL) {
          isTyping = true;
          break;
        }
      }
    }

    return NextResponse.json({ is_typing: isTyping });
  } catch {
    return NextResponse.json({ is_typing: false });
  }
}
