import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: auth required — ONLY returns authenticated user's notifications (IDOR fix)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread_only") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);

    const supabase = createServiceClient();

    let query = supabase
      .from("notifications")
      .select(`*, post:posts (id, content)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq("read", false);

    const { data: notifications, error } = await query;
    if (error) {
      // Fallback without joins
      const { data: fb, error: fbe } = await supabase
        .from("notifications").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(limit);
      if (fbe) throw fbe;

      const { count: unreadCount } = await supabase
        .from("notifications").select("*", { count: "exact", head: true })
        .eq("user_id", userId).eq("read", false);

      return NextResponse.json({ notifications: fb || [], unread_count: unreadCount || 0 });
    }

    // Enrich with actor profiles
    const actorIds = [...new Set((notifications || []).map((n) => n.actor_id).filter(Boolean))];
    let actorMap: Record<string, any> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, username, display_name, avatar_url").in("id", actorIds);
      for (const p of profiles || []) actorMap[p.id] = p;
    }

    const enriched = (notifications || []).map((n) => ({ ...n, actor: actorMap[n.actor_id] || null }));
    const { count: unreadCount } = await supabase
      .from("notifications").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("read", false);

    return NextResponse.json({ notifications: enriched, unread_count: unreadCount || 0 });
  } catch (error: any) {
    console.error("Notifications error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: auth required — mark as read
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { notification_ids, mark_all } = await request.json();
    const supabase = createServiceClient();

    if (mark_all) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    } else if (notification_ids?.length > 0) {
      await supabase.from("notifications").update({ read: true }).in("id", notification_ids).eq("user_id", userId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
