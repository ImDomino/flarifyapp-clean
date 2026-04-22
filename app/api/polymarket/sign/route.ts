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
 * HMAC signing endpoint for the Polymarket Relayer (relayer-v2.polymarket.com).
 *
 * The Relayer authenticates every /submit and /transaction request with a
 * builder-scoped HMAC signature. The @polymarket/builder-relayer-client SDK
 * calls this endpoint (via BuilderConfig's remoteBuilderConfig.url) whenever
 * it needs a fresh signature, so the builder secret stays on the server and
 * never touches the browser.
 *
 * This is NOT related to the CLOB Exchange V2 order-signing migration — the
 * V2 Exchange moved builder attribution into the signed order struct (bytes32),
 * but the Relayer service is orthogonal and still uses HMAC auth.
 */
export async function POST(request: NextRequest) {
  try {
    let userId = await getAuthenticatedUser(request);

    if (!userId) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");

      const isValidOrigin =
        (origin && host && origin.includes(host)) ||
        (referer && host && referer.includes(host));

      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

      if (!isValidOrigin) {
        console.warn(
          `[sign] No Privy auth and no valid Origin. origin=${origin}, referer=${referer}, host=${host}, ip=${ip}`
        );
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
      path || "/submit",
      reqBody || ""
    );

    console.log(
      `[sign] method=${method || "POST"}, path=${path || "/submit"}, bodyLen=${
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
