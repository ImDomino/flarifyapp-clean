import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
  isAdmin,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!(await isAdmin(userId))) return forbiddenResponse();

    const supabase = createServiceClient();

    // Get all waitlist entries
    const { data: waitlistEntries, error } = await supabase
      .from("waitlist")
      .select("email, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get emails that already have invite codes (approved)
    const { data: inviteCodes } = await supabase
      .from("invite_codes")
      .select("code, owner_id");

    // Get profiles that are beta approved, with their email from Privy metadata
    // Since we don't store email in profiles, we track approval by checking
    // if an invite code was generated for this waitlist email
    // We'll use a simple approach: check invite_codes where owner_id matches admin
    // and the code was generated for a specific email

    // Simpler approach: check if any invite code exists that was created
    // via the admin approve endpoint (we'll tag them with a note)
    const { data: approvedEmails } = await supabase
      .from("waitlist")
      .select("email")
      .not("approved_at", "is", null);

    const approvedSet = new Set(
      (approvedEmails || []).map((e: { email: string }) => e.email)
    );

    const entries = (waitlistEntries || []).map(
      (entry: { email: string; created_at: string }) => ({
        email: entry.email,
        created_at: entry.created_at,
        approved: approvedSet.has(entry.email),
      })
    );

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Admin waitlist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
