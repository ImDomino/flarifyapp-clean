import { createServiceClient } from "@/lib/supabase/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "https://flarify.app";

/** Map notification type → settings key */
const TYPE_TO_SETTING: Record<string, string> = {
  like: "likes",
  comment: "comments",
  follow: "follows",
  repost: "reposts",
  message: "messages",
  price_alert: "price_alerts",
};

/**
 * Send a Telegram message with HTML formatting.
 */
async function sendTelegram(chatId: string, text: string) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.warn("Telegram send failed:", e);
  }
}

interface NotifyOpts {
  type?: string;
  actorId?: string;
  postId?: string;
  extra?: string;
}

/**
 * Format a notification into a styled Telegram message.
 */
function formatTelegramMessage(
  type: string,
  actorName?: string,
  actorId?: string,
  postId?: string,
  extra?: string,
): string {
  const who = actorName
    ? actorId
      ? `<a href="${APP_URL}/user/${actorId}">${actorName}</a>`
      : `<b>${actorName}</b>`
    : "Someone";

  const viewPost = postId
    ? `<a href="${APP_URL}/post/${postId}">View post</a>`
    : null;

  const allNotifs = `<a href="${APP_URL}/notifications">All notifications</a>`;

  const links = (primary: string) => `\n\n\u2192  ${primary}  \u00B7  ${allNotifs}`;

  switch (type) {
    case "like":
      return `\u2764\uFE0F  <b>New Like</b>\n\n${who} liked your post${links(viewPost || allNotifs)}`;
    case "comment":
      return `\uD83D\uDCAC  <b>New Comment</b>\n\n${who} commented on your post${links(viewPost || allNotifs)}`;
    case "follow":
      return `\uD83D\uDC64  <b>New Follower</b>\n\n${who} started following you${links(actorId ? `<a href="${APP_URL}/user/${actorId}">View profile</a>` : allNotifs)}`;
    case "repost":
      return `\uD83D\uDD01  <b>New Repost</b>\n\n${who} reposted your post${links(viewPost || allNotifs)}`;
    case "message":
      return `\u2709\uFE0F  <b>New Message</b>\n\n${who} sent you a message${links(`<a href="${APP_URL}/messages">Open messages</a>`)}`;
    case "price_alert":
      return `\uD83D\uDD14  <b>Price Alert</b>\n\n${extra || "A price alert was triggered"}${links(`<a href="${APP_URL}/alerts">View alerts</a>`)}`;
    default:
      return `You have a new notification${links(allNotifs)}`;
  }
}

/**
 * Notify a user via:
 * 1. Supabase Realtime broadcast (instant in-app)
 * 2. Telegram message (if linked + enabled in settings)
 */
export async function notifyUser(userId: string, opts?: NotifyOpts) {
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
      .select("telegram_chat_id, settings")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.telegram_chat_id) return;

    // Check if this notification type is enabled in settings
    if (opts?.type) {
      const settingKey = TYPE_TO_SETTING[opts.type];
      if (settingKey) {
        const enabled = profile.settings?.notifications?.[settingKey];
        // If explicitly set to false, skip. Default (undefined) = enabled.
        if (enabled === false) return;
      }
    }

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

    const text = formatTelegramMessage(
      opts?.type || "",
      actorName,
      opts?.actorId,
      opts?.postId,
      opts?.extra,
    );
    await sendTelegram(profile.telegram_chat_id, text);
  } catch (e) {
    console.warn("Telegram notification failed:", e);
  }
}
