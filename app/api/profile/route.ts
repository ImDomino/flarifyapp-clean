import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { sanitizeText, isValidUserId } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: public — fetch profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId || !isValidUserId(userId))
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ profile: null, error: "Profile not found" }, { status: 404 });

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: auth required — update OWN profile only
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.updateProfile(userId)) return rateLimitResponse();

    const body = await request.json();
    const supabase = createServiceClient();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    // Validate and sanitize fields
    if (body.username !== undefined && body.username !== "") {
      const uname = sanitizeText(body.username, 30);
      if (!uname || uname.length < 2 || !/^[a-zA-Z0-9_]+$/.test(uname))
        return NextResponse.json({ error: "Username: 2-30 chars, letters/numbers/underscores" }, { status: 400 });
      // Uniqueness check
      const { data: existing } = await supabase
        .from("profiles").select("id").eq("username", uname).neq("id", userId).maybeSingle();
      if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      updates.username = uname;
    }
    if (body.display_name !== undefined) updates.display_name = sanitizeText(body.display_name, 50) || "";
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.bio !== undefined) updates.bio = sanitizeText(body.bio, 300) || "";

    // PnL visibility toggle
    if (body.show_pnl_public !== undefined) {
      updates.show_pnl_public = body.show_pnl_public === true;
    }

    if (Object.keys(updates).length <= 1)
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });

    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (error: any) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}
