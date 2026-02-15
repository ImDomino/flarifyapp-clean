import { NextRequest, NextResponse } from "next/server";
import { BuilderApiKeyCreds, buildHmacSignature } from "@polymarket/builder-signing-sdk";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

export async function POST(request: NextRequest) {
  try {
    // Auth required — prevent unauthenticated signing
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.placeOrder(userId)) return rateLimitResponse();

    const { method, path, body } = await request.json();
    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      method || "POST",
      path || "/order",
      body || ""
    );

    // SECURITY FIX: Return ONLY signature and timestamp.
    // Builder key/passphrase are added server-side by the order proxy.
    // This prevents credentials from leaking to client.
    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      // REMOVED: POLY_BUILDER_API_KEY, POLY_BUILDER_PASSPHRASE
      // These are now only used server-side in /api/polymarket/order
    });
  } catch (error: any) {
    console.error("Sign error:", error?.message);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
