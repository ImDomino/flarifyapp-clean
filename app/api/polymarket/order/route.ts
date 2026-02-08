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
 * The CLOB API requires 8 auth headers:
 * - POLY_ADDRESS, POLY_SIGNATURE, POLY_TIMESTAMP, POLY_API_KEY, POLY_PASSPHRASE (user)
 * - POLY_BUILDER_SIGNATURE, POLY_BUILDER_TIMESTAMP, POLY_BUILDER_API_KEY, POLY_BUILDER_PASSPHRASE (builder)
 *
 * The client sends: signedOrder + userCreds (key, secret, passphrase) + eoaAddress
 * The server generates HMAC signatures for both user and builder.
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

    const orderBody = JSON.stringify(order);
    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000).toString(); // seconds for user
    const builderTimestamp = now.toString(); // milliseconds for builder

    // Generate User L2 HMAC signature
    const userSignature = buildL2HmacSignature(
      userCreds.secret,
      Math.floor(now / 1000),
      "POST",
      "/order",
      orderBody
    );

    // Generate Builder HMAC signature
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      now,
      "POST",
      "/order",
      orderBody
    );

    console.log("ORDER PROXY:", {
      eoaAddress: eoaAddress.slice(0, 10) + "...",
      apiKey: userCreds.key.slice(0, 12) + "...",
      bodyLength: orderBody.length,
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
      body: orderBody,
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
