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
 * IMPORTANT: clobClient.createOrder() returns different structures depending on SDK version:
 * - Option 1: { deferExec, order: {...signedOrder}, owner, orderType }
 * - Option 2: {...signedOrder} directly (flat structure)
 *
 * We need to handle both and send the correct format to CLOB API.
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

    // Детальное логирование входящей структуры
    console.log("📥 Incoming order structure:", {
      hasDeferExec: "deferExec" in order,
      hasOrder: !!order.order,
      hasOwner: !!order.owner,
      orderType: order.orderType,
      topLevelKeys: Object.keys(order),
      nestedOrderKeys: order.order ? Object.keys(order.order) : "no nested order",
    });

    // ✅ Normalize order structure
    // CLOB API expects: { deferExec, order: {...}, owner, orderType }
    let normalizedOrder: any;

    if (order.order) {
      // Already has nested structure
      normalizedOrder = order;
      console.log("✅ Order already has nested structure");
    } else if (order.salt && order.maker && order.signer) {
      // Flat signed order, need to wrap it
      normalizedOrder = {
        deferExec: false,
        order: order,
        owner: "apiKey",
        orderType: "GTC",
      };
      console.log("✅ Wrapped flat order into nested structure");
    } else {
      // Unknown structure
      console.error("❌ Unknown order structure:", order);
      return NextResponse.json(
        { error: "Invalid order payload - unknown structure" },
        { status: 400 }
      );
    }

    // Validate nested order has required fields
    if (!normalizedOrder.order?.salt || !normalizedOrder.order?.maker) {
      console.error("❌ Invalid signed order:", normalizedOrder.order);
      return NextResponse.json(
        { error: "Invalid order payload - missing required fields (salt, maker)" },
        { status: 400 }
      );
    }

    const clobBody = JSON.stringify(normalizedOrder);
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

    console.log("📤 Sending to CLOB:", {
      eoaAddress: eoaAddress.slice(0, 10) + "...",
      apiKey: userCreds.key.slice(0, 12) + "...",
      hasDeferExec: "deferExec" in normalizedOrder,
      hasOrder: !!normalizedOrder.order,
      hasOwner: !!normalizedOrder.owner,
      orderType: normalizedOrder.orderType,
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
      console.error("❌ CLOB order error:", clobResponse.status, responseText);
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
      console.log("✅ CLOB order success:", json);
      return NextResponse.json(json);
    } catch {
      console.log("✅ CLOB order success (non-JSON):", responseText);
      return NextResponse.json({ result: responseText });
    }
  } catch (error: any) {
    console.error("❌ Order proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to proxy order" },
      { status: 500 }
    );
  }
}