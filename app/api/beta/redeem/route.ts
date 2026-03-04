import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { isValidInviteCode } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.redeemInvite(userId)) return rateLimitResponse();

    const body = await request.json();
    const { code } = body;

    if (!isValidInviteCode(code)) {
      return NextResponse.json({ error: "Invalid invite code format" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if already approved
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_beta_approved")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.is_beta_approved) {
      return NextResponse.json({ success: true, already_approved: true });
    }

    // Find the invite code
    const normalizedCode = code.toUpperCase();
    const { data: inviteCode } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
    }

    if (inviteCode.used_by) {
      return NextResponse.json({ error: "Invite code already used" }, { status: 409 });
    }

    if (inviteCode.owner_id === userId) {
      return NextResponse.json({ error: "Cannot use your own invite code" }, { status: 400 });
    }

    // Mark code as used (optimistic lock)
    const { error: updateCodeErr } = await supabase
      .from("invite_codes")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inviteCode.id)
      .is("used_by", null);

    if (updateCodeErr) {
      return NextResponse.json({ error: "Failed to redeem code" }, { status: 500 });
    }

    // Approve the user
    const { error: approveErr } = await supabase
      .from("profiles")
      .update({
        is_beta_approved: true,
        invited_by: inviteCode.owner_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (approveErr) {
      console.error("Failed to approve user:", approveErr);
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Beta redeem error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
