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
 * IMPORTANT: clobClient.createOrder() returns an ALREADY WRAPPED object:
 * { deferExec: false, order: { salt, maker, signer, ... }, owner: "apiKey", orderType: "GTC" }
 *
 * We must send this object EXACTLY as-is to CLOB /order endpoint.
 * Do NOT add any additional wrapping.
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

    // order from createOrder() is already the full CLOB payload:
    // { deferExec, order: {...signedOrder}, owner, orderType }
    // Send it exactly as-is
    const clobBody = JSON.stringify(order);
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

    console.log("ORDER PROXY:", {
      eoaAddress: eoaAddress.slice(0, 10) + "...",
      apiKey: userCreds.key.slice(0, 12) + "...",
      hasOrder: !!order.order,
      hasDeferExec: "deferExec" in order,
      hasOwner: !!order.owner,
      orderType: order.orderType,
      bodyLength: clobBody.length,
    });

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
