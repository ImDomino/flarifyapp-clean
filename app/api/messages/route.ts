import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { notifyUser } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const MAX_CONTENT_LENGTH = 5000;

function getAllowedImageHost(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    return url.hostname;
  } catch {
    return "";
  }
}

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

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Helper: update conversation preview with the latest non-deleted message
async function updateConversationPreview(supabase: any, conversationId: string) {
  const { data: latest } = await supabase
    .from("messages")
    .select("content, image_url, deleted_at")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const preview = latest
    ? (latest.content
        ? (latest.content.length > 100 ? latest.content.slice(0, 97) + "..." : latest.content)
        : "Sent an image")
    : "Message deleted";

  await supabase
    .from("conversations")
    .update({ last_message_preview: preview })
    .eq("id", conversationId);
}

// GET: fetch messages in a conversation (with reply data)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const before = searchParams.get("before");

    if (!conversationId || !isValidUUID(conversationId)) {
      return NextResponse.json({ error: "Valid conversation_id required" }, { status: 400 });
    }

    const supabase = createServiceClient();

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
      .select(`
        *,
        reply_to:reply_to_id (
          id,
          sender_id,
          content,
          image_url,
          deleted_at
        )
      `)
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

// POST: send a message (supports reply_to_id)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    if (!checkRateLimit(userId)) {
      return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429 });
    }

    const body = await request.json();
    const { recipient_id, content, image_url, reply_to_id } = body;

    if (!recipient_id || typeof recipient_id !== "string") {
      return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
    }
    if (!content?.trim() && !image_url) {
      return NextResponse.json({ error: "Message content or image required" }, { status: 400 });
    }
    if (recipient_id === userId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }
    if (content && typeof content === "string" && content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_CONTENT_LENGTH} characters)` }, { status: 400 });
    }
    if (image_url) {
      if (typeof image_url !== "string" || !isValidImageUrl(image_url)) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
    }

    const supabase = createServiceClient();

    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", recipient_id)
      .maybeSingle();

    if (!recipientProfile) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

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

    // Validate reply_to_id if provided
    if (reply_to_id) {
      if (typeof reply_to_id !== "string" || !isValidUUID(reply_to_id)) {
        return NextResponse.json({ error: "Invalid reply_to_id" }, { status: 400 });
      }
      const { data: replyMsg } = await supabase
        .from("messages")
        .select("id, conversation_id")
        .eq("id", reply_to_id)
        .single();
      if (!replyMsg || replyMsg.conversation_id !== conv!.id) {
        return NextResponse.json({ error: "Invalid reply target" }, { status: 400 });
      }
    }

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
        reply_to_id: reply_to_id || null,
      })
      .select(`
        *,
        reply_to:reply_to_id (
          id,
          sender_id,
          content,
          image_url,
          deleted_at
        )
      `)
      .single();

    if (msgError) throw msgError;

    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: preview,
      })
      .eq("id", conv!.id);

    try {
      await supabase.from("notifications").insert({
        user_id: recipient_id,
        type: "message",
        actor_id: userId,
        content: preview,
      });
      notifyUser(recipient_id, { type: "message", actorId: userId });
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, message, conversation_id: conv!.id });
  } catch (error: any) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: edit message content (sender only)
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { message_id, content } = body;

    if (!message_id || typeof message_id !== "string" || !isValidUUID(message_id)) {
      return NextResponse.json({ error: "Valid message_id required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: `Message too long (max ${MAX_CONTENT_LENGTH} characters)` }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: msg } = await supabase
      .from("messages")
      .select("id, sender_id, conversation_id, deleted_at")
      .eq("id", message_id)
      .single();

    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg.sender_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.deleted_at) return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });

    const { data: updated, error } = await supabase
      .from("messages")
      .update({ content: content.trim(), edited_at: new Date().toISOString() })
      .eq("id", message_id)
      .select(`
        *,
        reply_to:reply_to_id (
          id,
          sender_id,
          content,
          image_url,
          deleted_at
        )
      `)
      .single();

    if (error) throw error;

    // Update conversation preview if this was the latest message
    await updateConversationPreview(supabase, msg.conversation_id);

    return NextResponse.json({ success: true, message: updated });
  } catch (error: any) {
    console.error("Messages PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE: soft-delete a message (sender only)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("message_id");

    if (!messageId || !isValidUUID(messageId)) {
      return NextResponse.json({ error: "Valid message_id required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: msg } = await supabase
      .from("messages")
      .select("id, sender_id, conversation_id, deleted_at")
      .eq("id", messageId)
      .single();

    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg.sender_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (msg.deleted_at) return NextResponse.json({ error: "Already deleted" }, { status: 400 });

    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), content: null, image_url: null })
      .eq("id", messageId);

    if (error) throw error;

    // Update conversation preview
    await updateConversationPreview(supabase, msg.conversation_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Messages DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
