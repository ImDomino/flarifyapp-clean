import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import crypto from "crypto";

/**
 * POST /api/polymarket/order
 *
 * Server-side proxy for posting signed orders to Polymarket CLOB.
 *
 * The client sends: { order: SignedOrder, orderType?: string, userCreds, eoaAddress }
 * The server:
 * 1. Wraps order in CLOB-expected format: { order: SignedOrder, orderType: "GTC" }
 * 2. Generates User HMAC signature
 * 3. Generates Builder HMAC signature
 * 4. Forwards to clob.polymarket.com/order with all 9 headers
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
    const { order, orderType, userCreds, eoaAddress } = body;

    if (!order || !userCreds || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing order, userCreds, or eoaAddress" },
        { status: 400 }
      );
    }

    // CLOB /order expects: { "order": <SignedOrder>, "orderType": "GTC" }
    // The signedOrder from createOrder() IS the order object
    // We need to wrap it in the expected envelope
    const clobPayload = {
      order: order,
      orderType: orderType || "GTC",
    };

    const clobBody = JSON.stringify(clobPayload);
    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000).toString(); // seconds for user
    const builderTimestamp = now.toString(); // milliseconds for builder

    // Generate User L2 HMAC signature
    const userSignature = buildL2HmacSignature(
      userCreds.secret,
      Math.floor(now / 1000),
      "POST",
      "/order",
      clobBody
    );

    // Generate Builder HMAC signature
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      now,
      "POST",
      "/order",
      clobBody
    );

    console.log("ORDER PROXY:", {
      eoaAddress: eoaAddress.slice(0, 10) + "...",
      apiKey: userCreds.key.slice(0, 12) + "...",
      orderType: clobPayload.orderType,
      bodyLength: clobBody.length,
      bodyPreview: clobBody.slice(0, 200) + "...",
    });

    // Forward to CLOB with ALL required headers
    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // User API auth headers (underscore format, matching SDK)
        POLY_ADDRESS: eoaAddress,
        POLY_SIGNATURE: userSignature,
        POLY_TIMESTAMP: userTimestamp,
        POLY_API_KEY: userCreds.key,
        POLY_PASSPHRASE: userCreds.passphrase,
        // Builder auth headers
        POLY_BUILDER_SIGNATURE: builderSignature,
        POLY_BUILDER_TIMESTAMP: builderTimestamp,
        POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
        POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
      },
      body: clobBody,
    });

    const responseText = await clobResponse.text();

    if (!clobResponse.ok) {
      console.error("CLOB order error:", clobResponse.status, responseText);
      return NextResponse.json(
        {
          error: "CLOB order failed",
          status: clobResponse.status,
          details: responseText,
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
