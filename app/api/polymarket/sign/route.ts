import { NextRequest, NextResponse } from "next/server";
import { BuilderApiKeyCreds, buildHmacSignature } from "@polymarket/builder-signing-sdk";
import { getAuthenticatedUser } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

/**
 * POST /api/polymarket/sign
 *
 * Called by BuilderConfig remote signing (inside @polymarket/clob-client SDK).
 * The SDK does NOT send a Privy Bearer token — it's an internal HTTP call.
 *
 * Security approach:
 * - Try Privy auth first (if token present)
 * - If no token, validate Origin header (same-origin requests only)
 * - Rate limit by IP as fallback
 * - Only returns HMAC signature + timestamp (no credentials leaked)
 */
export async function POST(request: NextRequest) {
  try {
    // Try Privy auth first
    let userId = await getAuthenticatedUser(request);

    if (!userId) {
      // SDK call without Privy token — validate same-origin
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");

      const isValidOrigin =
        (origin && host && origin.includes(host)) ||
        (referer && host && referer.includes(host));

      if (!isValidOrigin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Rate limit by IP for unauthenticated requests
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (!RL.placeOrder(`ip:${ip}`)) return rateLimitResponse();
    } else {
      if (!RL.placeOrder(userId)) return rateLimitResponse();
    }

    const { method, path, body } = await request.json();
    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      method || "POST",
      path || "/order",
      body || ""
    );

    // Return ONLY signature and timestamp — no credentials
    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
    });
  } catch (error: any) {
    console.error("Sign error:", error?.message);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
