import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
  isAdmin,
} from "@/lib/auth";
import { generateSingleInviteCode } from "@/lib/invite";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!(await isAdmin(userId))) return forbiddenResponse();

    const body = await request.json().catch(() => ({}));
    const email = body?.email;

    const supabase = createServiceClient();

    // Generate a single invite code owned by admin
    const inviteCode = await generateSingleInviteCode(userId);

    // If email provided, mark waitlist entry as approved
    if (email && typeof email === "string") {
      await supabase
        .from("waitlist")
        .update({ approved_at: new Date().toISOString() })
        .eq("email", email.toLowerCase().trim());
    }

    const inviteLink = `/?invite=${inviteCode}`;

    return NextResponse.json({
      success: true,
      inviteCode,
      inviteLink,
    });
  } catch (error) {
    console.error("Admin approve error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
