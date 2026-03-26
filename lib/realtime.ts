import { createServiceClient } from "@/lib/supabase/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * Send a Telegram message to a user if they have linked their account.
 * Fire-and-forget — failures are logged but don't block.
 */
async function sendTelegram(chatId: string, text: string) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.warn("Telegram send failed:", e);
  }
}

/**
 * Format a notification into a human-readable Telegram message.
 */
function formatTelegramMessage(
  type: string,
  actorName?: string,
  extra?: string,
): string {
  const who = actorName || "Someone";
  switch (type) {
    case "like":
      return `${who} liked your post`;
    case "comment":
      return `${who} commented on your post`;
    case "follow":
      return `${who} started following you`;
    case "repost":
      return `${who} reposted your post`;
    case "message":
      return `${who} sent you a message`;
    case "price_alert":
      return extra || "A price alert was triggered";
    default:
      return "You have a new notification on Flarify";
  }
}

/**
 * Notify a user via:
 * 1. Supabase Realtime broadcast (instant in-app)
 * 2. Telegram message (if linked)
 *
 * Called from API routes after inserting a notification row.
 */
export async function notifyUser(
  userId: string,
  opts?: { type?: string; actorId?: string; extra?: string },
) {
  const supabase = createServiceClient();

  // ── 1. Realtime broadcast ──
  try {
    const channel = supabase.channel(`notifications:${userId}`);
    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(status));
      });
    });
    await channel.send({
      type: "broadcast",
      event: "new_notification",
      payload: {},
    });
    await new Promise((r) => setTimeout(r, 100));
    await supabase.removeChannel(channel);
  } catch (e) {
    console.warn("Realtime broadcast failed:", e);
  }

  // ── 2. Telegram ──
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.telegram_chat_id) {
      // Resolve actor display name
      let actorName: string | undefined;
      if (opts?.actorId) {
        const { data: actor } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", opts.actorId)
          .maybeSingle();
        actorName = actor?.display_name || actor?.username || undefined;
      }

      const text = formatTelegramMessage(opts?.type || "", actorName, opts?.extra);
      await sendTelegram(profile.telegram_chat_id, text);
    }
  } catch (e) {
    console.warn("Telegram notification failed:", e);
  }
}
