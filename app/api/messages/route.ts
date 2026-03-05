import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_CONTENT_LENGTH = 5000;

// Derive allowed image host from Supabase URL
function getAllowedImageHost(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    return url.hostname;
  } catch {
    return "";
  }
}

// Simple in-memory rate limiter: max 20 messages per 60s per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const allowedHost = getAllowedImageHost();
    if (!allowedHost) return false;
    return parsed.hostname === allowedHost;
  } catch {
    return false;
  }
}

// GET: fetch messages in a conversation
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const before = searchParams.get("before");

    if (!conversationId) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)) {
      return NextResponse.json({ error: "Invalid conversation_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify user is part of this conversation
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id")
      .eq("id", conversationId)
      .single();

    if (!conv || (conv.user1_id !== userId && conv.user2_id !== userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      messages: (messages || []).reverse(),
      has_more: (messages || []).length === limit,
    });
  } catch (error: any) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: send a message
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    // Rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
    }

    const body = await request.json();
    const { recipient_id, content, image_url } = body;

    if (!recipient_id || typeof recipient_id !== "string") {
      return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
    }
    if (!content?.trim() && !image_url) {
      return NextResponse.json({ error: "Message content or image required" }, { status: 400 });
    }
    if (recipient_id === userId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    // Validate content length
    if (content && typeof content === "string" && content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_CONTENT_LENGTH} characters)` }, { status: 400 });
    }

    // Validate image URL if provided
    if (image_url) {
      if (typeof image_url !== "string" || !isValidImageUrl(image_url)) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
    }

    const supabase = createServiceClient();

    // Verify recipient exists
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", recipient_id)
      .maybeSingle();

    if (!recipientProfile) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Find or create conversation (ensure consistent ordering)
    const [u1, u2] = [userId, recipient_id].sort();

    let { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .single();

    if (!conv) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({ user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (convError) throw convError;
      conv = newConv;
    }

    // Insert message
    const messageContent = content?.trim() || null;
    const preview = messageContent
      ? messageContent.length > 100 ? messageContent.slice(0, 97) + "..." : messageContent
      : "Sent an image";

    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conv!.id,
        sender_id: userId,
        content: messageContent,
        image_url: image_url || null,
      })
      .select("*")
      .single();

    if (msgError) throw msgError;

    // Update conversation last_message
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
      })
      .eq("id", conv!.id);

    // Create notification for recipient
    try {
      await supabase.from("notifications").insert({
        user_id: recipient_id,
        type: "message",
        actor_id: userId,
        content: preview,
      });
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, message, conversation_id: conv!.id });
  } catch (error: any) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
