import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";

// Force US region — Polymarket blocks certain geos via Cloudflare
export const runtime = "nodejs";
export const preferredRegion = "iad1"; // US East (Washington DC)
import crypto from "crypto";

/**
 * POST /api/polymarket/order
 *
 * Server-side proxy for posting signed orders to Polymarket CLOB.
 *
 * STRATEGY: Server always controls wrapping.
 * - Client sends raw signedOrder (flat: {salt, maker, signer, ...})
 * - If client accidentally wrapped it, server unwraps first
 * - Server wraps as: { order: flatOrder, owner: apiKey, orderType: "GTC" }
 * - Server generates HMAC from this exact body
 * - This guarantees HMAC always matches the body sent to CLOB
 */

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

// Generate L2 HMAC signature (same algo as @polymarket/clob-client uses internally)
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
    const { order, userCreds, eoaAddress } = body;

    if (!order || !userCreds || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing order, userCreds, or eoaAddress" },
        { status: 400 }
      );
    }

    // STRATEGY: Server ALWAYS controls the wrapping.
    // Extract the flat signed order regardless of how client sent it,
    // then wrap it ourselves with the correct owner (API key).
    
    console.log("📥 INCOMING ORDER:", {
      topLevelKeys: Object.keys(order),
      hasSalt: !!order.salt,
      hasMaker: !!order.maker,
      hasNestedOrder: !!order.order,
      hasOwner: !!order.owner,
      hasOrderType: !!order.orderType,
    });
    
    // Extract the flat signed order (the raw EIP-712 signed struct)
    let flatOrder: any;
    
    if (order.order && order.order.salt && order.order.maker) {
      // Client already wrapped — unwrap to get flat order
      flatOrder = order.order;
      console.log("📦 Unwrapped client-wrapped order");
    } else if (order.salt && order.maker && order.signature) {
      // Client sent flat order — use directly
      flatOrder = order;
      console.log("📦 Received flat signed order");
    } else {
      console.error("❌ Cannot find signed order. Keys:", Object.keys(order));
      return NextResponse.json(
        { error: "Invalid order: no signed order found", keys: Object.keys(order) },
        { status: 400 }
      );
    }
    
    // Always wrap it ourselves with correct owner
    const clobPayload = {
      order: flatOrder,
      owner: userCreds.key,  // API key = owner
      orderType: "GTC",
    };
    
    console.log("📤 CLOB payload:", {
      owner: userCreds.key.slice(0, 12) + "...",
      orderType: "GTC",
      orderKeys: Object.keys(flatOrder),
      maker: flatOrder.maker?.slice(0, 10) + "...",
      signer: flatOrder.signer?.slice(0, 10) + "...",
    });
    
    const clobBody = JSON.stringify(clobPayload);
    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000); // seconds for user
    const builderTimestamp = now; // milliseconds for builder

    // Generate User L2 HMAC signature
    const userSignature = buildL2HmacSignature(
      userCreds.secret,
      userTimestamp,
      "POST",
      "/order",
      clobBody
    );

    // Generate Builder HMAC signature
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      builderTimestamp,
      "POST",
      "/order",
      clobBody
    );

    console.log("🔐 HMAC signed, sending to CLOB. Body length:", clobBody.length);

    // Forward to CLOB with ALL required headers
    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // User API auth headers
        POLY_ADDRESS: eoaAddress,
        POLY_SIGNATURE: userSignature,
        POLY_TIMESTAMP: userTimestamp.toString(),
        POLY_API_KEY: userCreds.key,
        POLY_PASSPHRASE: userCreds.passphrase,
        // Builder auth headers
        POLY_BUILDER_SIGNATURE: builderSignature,
        POLY_BUILDER_TIMESTAMP: builderTimestamp.toString(),
        POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
        POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
      },
      body: clobBody,
    });

    const responseText = await clobResponse.text();

    if (!clobResponse.ok) {
      const isCloudflareBlock = responseText.includes("Cloudflare") || responseText.includes("blocked");
      const errorDetail = isCloudflareBlock
        ? "Blocked by Cloudflare geo-restriction on clob.polymarket.com"
        : responseText.slice(0, 500);
      console.error("CLOB order error:", clobResponse.status, errorDetail);
      return NextResponse.json(
        {
          error: "CLOB order failed",
          status: clobResponse.status,
          details: errorDetail,
        },
        { status: clobResponse.status }
      );
    }

    try {
      const json = JSON.parse(responseText);
      console.log("CLOB order success:", json);
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