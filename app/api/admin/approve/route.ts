import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
  isAdmin,
} from "@/lib/auth";
import { generateInviteCodesForUser } from "@/lib/invite";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!(await isAdmin(userId))) return forbiddenResponse();

    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Generate invite codes owned by the admin (the waitlist user will
    // redeem one of these when they sign up)
    const codes = await generateInviteCodesForUser(userId);

    // Mark waitlist entry as approved
    await supabase
      .from("waitlist")
      .update({ approved_at: new Date().toISOString() })
      .eq("email", email.toLowerCase().trim());

    // Return the first code as the invite link
    const inviteCode = codes[0];
    const inviteLink = `/?invite=${inviteCode}`;

    return NextResponse.json({
      success: true,
      inviteCode,
      inviteLink,
      allCodes: codes,
    });
  } catch (error) {
    console.error("Admin approve error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
