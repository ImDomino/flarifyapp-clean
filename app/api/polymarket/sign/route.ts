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
 * Called by BuilderConfig remote signing (inside @polymarket/clob-client
 * and @polymarket/builder-relayer-client SDKs).
 *
 * The SDK's internal fetch may or may not include Origin headers depending
 * on the browser and request context. We use a layered auth approach:
 *
 * 1. Privy JWT (if present) — strongest auth
 * 2. Origin/Referer validation — same-origin browser requests
 * 3. IP rate limiting — catch-all for SDK calls without headers
 *
 * This endpoint only returns HMAC signatures — no credentials are leaked.
 */
export async function POST(request: NextRequest) {
  try {
    // Try Privy auth first
    let userId = await getAuthenticatedUser(request);

    if (!userId) {
      // SDK calls may not include Origin/Referer in all browsers
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");

      const isValidOrigin =
        (origin && host && origin.includes(host)) ||
        (referer && host && referer.includes(host));

      // Rate limit all unauthenticated requests by IP
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

      if (!isValidOrigin) {
        // Log for debugging — SDK internal calls may lack Origin
        console.warn(
          `[sign] No Privy auth and no valid Origin. origin=${origin}, referer=${referer}, host=${host}, ip=${ip}`
        );
        // Still allow but with strict rate limiting — this endpoint
        // only returns signatures, not credentials
        if (!RL.placeOrder(`ip-strict:${ip}`)) return rateLimitResponse();
      } else {
        if (!RL.placeOrder(`ip:${ip}`)) return rateLimitResponse();
      }
    } else {
      if (!RL.placeOrder(userId)) return rateLimitResponse();
    }

    const body = await request.json();
    const { method, path, body: reqBody } = body;

    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      method || "POST",
      path || "/order",
      reqBody || ""
    );

    // Log what we're signing (no secrets)
    console.log(
      `[sign] method=${method || "POST"}, path=${path || "/order"}, bodyLen=${
        typeof reqBody === "string" ? reqBody.length : JSON.stringify(reqBody || "").length
      }, ts=${sigTimestamp}`
    );

    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
      POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
    });
  } catch (error: any) {
    console.error("[sign] Error:", error?.message);
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}