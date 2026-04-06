import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint: executes scheduled likes whose time has come.
 * Called every 5 minutes by Vercel Cron or external cron service.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret — always required
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Fetch due scheduled likes (max 50 per run)
  const { data: pending, error: fetchError } = await supabase
    .from("scheduled_likes")
    .select("id, post_id, user_id")
    .lte("execute_at", now)
    .limit(50);

  if (fetchError || !pending || pending.length === 0) {
    return NextResponse.json({ ok: true });
  }

  let inserted = 0;
  const processedIds: string[] = [];

  for (const item of pending) {
    // Insert like (ignore if duplicate)
    const { error } = await supabase
      .from("likes")
      .insert({ post_id: item.post_id, user_id: item.user_id });

    if (!error) inserted++;
    processedIds.push(item.id);
  }

  // Delete processed scheduled likes
  if (processedIds.length > 0) {
    await supabase
      .from("scheduled_likes")
      .delete()
      .in("id", processedIds);
  }

  return NextResponse.json({ ok: true });
}
