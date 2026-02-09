import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import crypto from "crypto";

// Force US region — Polymarket blocks certain geos via Cloudflare
export const runtime = "nodejs";
export const preferredRegion = "iad1"; // US East (Washington DC)

/**
 * POST /api/polymarket/order
 *
 * Fallback proxy for when createAndPostOrder() is blocked by CORS/geo.
 *
 * Reproduces the EXACT payload format the SDK uses (from observed logs):
 * {
 *   "deferExec": false,
 *   "order": { salt, maker, signer, taker, tokenId, makerAmount, takerAmount, ... },
 *   "owner": "apiKey-uuid",
 *   "orderType": "GTC"
 * }
 *
 * And the EXACT headers:
 * POLY_ADDRESS, POLY_SIGNATURE, POLY_TIMESTAMP, POLY_API_KEY, POLY_PASSPHRASE
 * POLY_BUILDER_SIGNATURE, POLY_BUILDER_TIMESTAMP, POLY_BUILDER_API_KEY, POLY_BUILDER_PASSPHRASE
 */

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

// L2 HMAC — matches SDK's internal implementation
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signedOrder, userCreds, eoaAddress } = body;

    if (!signedOrder || !userCreds || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing signedOrder, userCreds, or eoaAddress" },
        { status: 400 }
      );
    }

    // Extract flat signed order — handle both flat and pre-wrapped
    let flatOrder: any;
    if (signedOrder.salt && signedOrder.maker && signedOrder.signature) {
      flatOrder = signedOrder;
    } else if (signedOrder.order?.salt && signedOrder.order?.maker) {
      flatOrder = signedOrder.order;
    } else {
      return NextResponse.json(
        { error: "Invalid signed order structure", keys: Object.keys(signedOrder) },
        { status: 400 }
      );
    }

    // Build EXACT payload format matching SDK's createAndPostOrder output:
    // {"deferExec":false,"order":{...},"owner":"apiKey","orderType":"GTC"}
    const clobPayload = {
      deferExec: false,
      order: flatOrder,
      owner: userCreds.key,
      orderType: "GTC",
    };

    const clobBody = JSON.stringify(clobPayload);

    console.log("📤 PROXY ORDER:", {
      owner: userCreds.key.slice(0, 12) + "...",
      maker: flatOrder.maker?.slice(0, 10) + "...",
      signer: flatOrder.signer?.slice(0, 10) + "...",
      bodyLength: clobBody.length,
    });

    // Timestamps — SDK uses seconds for user, milliseconds for builder
    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000);
    const builderTimestamp = now;

    // User L2 HMAC
    const userSignature = buildL2HmacSignature(
      userCreds.secret,
      userTimestamp,
      "POST",
      "/order",
      clobBody
    );

    // Builder HMAC
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      builderTimestamp,
      "POST",
      "/order",
      clobBody
    );

    // Forward to CLOB with exact same headers SDK uses
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
      const isBlock =
        responseText.includes("Cloudflare") || responseText.includes("blocked");
      const detail = isBlock
        ? "Blocked by Cloudflare geo-restriction on clob.polymarket.com"
        : responseText.slice(0, 500);
      console.error("❌ CLOB error:", clobResponse.status, detail);
      return NextResponse.json(
        { error: "CLOB order failed", status: clobResponse.status, details: detail },
        { status: clobResponse.status }
      );
    }

    try {
      const json = JSON.parse(responseText);
      console.log("✅ CLOB success:", json);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ result: responseText });
    }
  } catch (error: any) {
    console.error("Order proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to proxy order" },
      { status: 500 }
    );
  }
}