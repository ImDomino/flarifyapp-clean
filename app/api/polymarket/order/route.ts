import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";

export const runtime = "nodejs";
export const preferredRegion = "dub1";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

/**
 * L2 HMAC signature for user credentials.
 * This is what the SDK computes internally in createAndPostOrder().
 * We reproduce it here for the proxy fallback.
 */
function buildL2HmacSignature(
  secret: string,
  timestamp: number,
  method: string,
  requestPath: string,
  body: string
): string {
  const message = `${timestamp}${method}${requestPath}${body}`;
  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64"));
  hmac.update(message);
  return hmac.digest("base64");
}

/**
 * POST /api/polymarket/order
 *
 * Fallback proxy — only used when direct createAndPostOrder() is CORS/geo-blocked.
 *
 * Accepts userCreds in body (like the original working code).
 * This is safe because:
 * - Endpoint requires authentication (getAuthenticatedUser)
 * - Credentials are per-user, not builder credentials
 * - Same security model as Polymarket's official example (localStorage)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.placeOrder(userId)) return rateLimitResponse();

    const body = await request.json();
    const { signedOrder, userCreds, eoaAddress } = body;

    if (!signedOrder || !userCreds || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!userCreds.key || !userCreds.secret || !userCreds.passphrase) {
      return NextResponse.json(
        { error: "Invalid user credentials" },
        { status: 400 }
      );
    }

    // Normalize signed order
    let flatOrder: any;
    if (signedOrder.salt && signedOrder.maker && signedOrder.signature) {
      flatOrder = signedOrder;
    } else if (signedOrder.order?.salt) {
      flatOrder = signedOrder.order;
    } else {
      return NextResponse.json({ error: "Invalid signed order" }, { status: 400 });
    }

    const clobPayload = {
      deferExec: false,
      order: flatOrder,
      owner: userCreds.key,
      orderType: "GTC",
    };
    const clobBody = JSON.stringify(clobPayload);

    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000);
    const builderTimestamp = now;

    const userSignature = buildL2HmacSignature(
      userCreds.secret, userTimestamp, "POST", "/order", clobBody
    );
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret, builderTimestamp, "POST", "/order", clobBody
    );

    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        POLY_ADDRESS: eoaAddress,
        POLY_SIGNATURE: userSignature,
        POLY_TIMESTAMP: userTimestamp.toString(),
        POLY_API_KEY: userCreds.key,
        POLY_PASSPHRASE: userCreds.passphrase,
        POLY_BUILDER_SIGNATURE: builderSignature,
        POLY_BUILDER_TIMESTAMP: builderTimestamp.toString(),
        POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
        POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
      },
      body: clobBody,
    });

    const responseText = await clobResponse.text();

    if (!clobResponse.ok) {
      console.error("[ORDER PROXY] CLOB error:", {
        status: clobResponse.status,
        body: responseText.slice(0, 500),
      });

      const isBlock = responseText.includes("Cloudflare") || responseText.includes("blocked");
      const detail = isBlock
        ? "Blocked by Cloudflare geo-restriction"
        : responseText.slice(0, 500);

      return NextResponse.json(
        { error: "CLOB order failed", details: detail },
        { status: clobResponse.status }
      );
    }

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ result: responseText });
    }
  } catch (error: any) {
    console.error("[ORDER PROXY] Error:", error?.message);
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}