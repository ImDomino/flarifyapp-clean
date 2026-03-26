import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "";

// GET: check if Telegram is connected
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("telegram_chat_id, telegram_username")
      .eq("id", userId)
      .maybeSingle();

    return NextResponse.json({
      connected: !!data?.telegram_chat_id,
      username: data?.telegram_username || null,
    });
  } catch (error: any) {
    console.error("Telegram link GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: generate a link token and return the bot deep link
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    if (!BOT_USERNAME) {
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 503 }
      );
    }

    const supabase = createServiceClient();

    // Invalidate any existing unused tokens for this user
    await supabase
      .from("telegram_link_tokens")
      .update({ used: true })
      .eq("user_id", userId)
      .eq("used", false);

    // Generate a new token
    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { error } = await supabase.from("telegram_link_tokens").insert({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });

    if (error) throw error;

    const url = `https://t.me/${BOT_USERNAME}?start=${token}`;

    return NextResponse.json({ url, token });
  } catch (error: any) {
    console.error("Telegram link POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE: disconnect Telegram
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        telegram_chat_id: null,
        telegram_username: null,
      })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Telegram link DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
