import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_beta_approved, invited_by")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ approved: false, codes: [] });
    }

    let codes: any[] = [];
    if (profile.is_beta_approved) {
      const { data: inviteCodes } = await supabase
        .from("invite_codes")
        .select("code, used_by, used_at, created_at")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true });
      codes = inviteCodes || [];
    }

    return NextResponse.json({
      approved: profile.is_beta_approved || false,
      invited_by: profile.invited_by,
      codes,
    });
  } catch (error) {
    console.error("Beta status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
