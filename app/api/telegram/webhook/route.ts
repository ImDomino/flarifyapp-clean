import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

// POST: receive updates from Telegram Bot API webhook
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret via query param
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    if (!secret || secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = await request.json();
    const message = update?.message;
    if (!message?.text || !message?.from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const telegramUsername = message.from.username || null;
    const supabase = createServiceClient();

    // Handle /start {token} — link account
    if (text.startsWith("/start ")) {
      const token = text.slice(7).trim();
      if (!token) {
        await sendTelegramMessage(chatId, "Invalid link token. Please try again from Flarify settings.");
        return NextResponse.json({ ok: true });
      }

      // Find valid, unused, non-expired token
      const { data: linkToken } = await supabase
        .from("telegram_link_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!linkToken) {
        await sendTelegramMessage(
          chatId,
          "This link has expired or is invalid. Please generate a new one in Flarify settings."
        );
        return NextResponse.json({ ok: true });
      }

      // Mark token as used
      await supabase
        .from("telegram_link_tokens")
        .update({ used: true })
        .eq("id", linkToken.id);

      // Save telegram info to profile
      const { error } = await supabase
        .from("profiles")
        .update({
          telegram_chat_id: String(chatId),
          telegram_username: telegramUsername,
        })
        .eq("id", linkToken.user_id);

      if (error) {
        await sendTelegramMessage(chatId, "Something went wrong. Please try again.");
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        chatId,
        "Your Telegram account is now linked to Flarify! You will receive market alerts here.\n\nSend /stop to unlink your account."
      );

      return NextResponse.json({ ok: true });
    }

    // Handle /stop — unlink account
    if (text === "/stop") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_chat_id", String(chatId))
        .maybeSingle();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ telegram_chat_id: null, telegram_username: null })
          .eq("id", profile.id);

        await sendTelegramMessage(chatId, "Your Telegram account has been unlinked from Flarify.");
      } else {
        await sendTelegramMessage(chatId, "No linked Flarify account found.");
      }

      return NextResponse.json({ ok: true });
    }

    // Handle /start without token
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        "Welcome to the Flarify Bot!\n\nTo link your account, go to <b>Settings → Linked Accounts</b> in the Flarify app and click <b>Connect Telegram</b>."
      );
      return NextResponse.json({ ok: true });
    }

    // Default: unknown command
    await sendTelegramMessage(
      chatId,
      "I only respond to /start and /stop commands. Go to Flarify settings to link your account."
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Always 200 for Telegram
  }
}
