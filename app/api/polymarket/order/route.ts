import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";

/**
 * POST /api/polymarket/order
 *
 * Server-side proxy for posting signed orders to Polymarket CLOB.
 * The CLOB API blocks browser requests (CORS), so we proxy through our server.
 *
 * The client sends:
 * - order: the signed order object from ClobClient.createOrder()
 * - headers: { POLY-ADDRESS, POLY-SIGNATURE, POLY-PASSPHRASE } (user API creds)
 */

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order, headers: userHeaders } = body;

    if (!order) {
      return NextResponse.json({ error: "Missing order" }, { status: 400 });
    }

    // Build HMAC signature for builder attribution
    const orderBody = JSON.stringify(order);
    const timestamp = Date.now().toString();
    const hmacSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(timestamp),
      "POST",
      "/order",
      orderBody
    );

    // Forward to CLOB with both user API creds and builder headers
    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // User API credentials (for order authorization)
        "POLY-ADDRESS": userHeaders?.["POLY-ADDRESS"] || "",
        "POLY-SIGNATURE": userHeaders?.["POLY-SIGNATURE"] || "",
        "POLY-PASSPHRASE": userHeaders?.["POLY-PASSPHRASE"] || "",
        // Builder credentials (for attribution)
        "POLY-BUILDER-API-KEY": BUILDER_CREDENTIALS.key,
        "POLY-BUILDER-SIGNATURE": hmacSignature,
        "POLY-BUILDER-TIMESTAMP": timestamp,
        "POLY-BUILDER-PASSPHRASE": BUILDER_CREDENTIALS.passphrase,
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
