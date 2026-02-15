import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { getCredsFromCookie } from "@/app/api/polymarket/credentials/route";

export const runtime = "nodejs";
export const preferredRegion = "dub1"; // ВАЖНО: Dublin / eu-west-1

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.placeOrder(userId)) return rateLimitResponse();

    const body = await request.json();
    const { signedOrder, eoaAddress } = body;

    if (!signedOrder || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userCreds = getCredsFromCookie(request);
    if (!userCreds) {
      return NextResponse.json(
        {
          error:
            "Trading credentials not found. Please re-authenticate (API key missing).",
        },
        { status: 401 }
      );
    }

    let flatOrder: any;
    if (signedOrder.salt && signedOrder.maker && signedOrder.signature) {
      flatOrder = signedOrder;
    } else if (signedOrder.order?.salt) {
      flatOrder = signedOrder.order;
    } else {
      return NextResponse.json(
        { error: "Invalid signed order structure" },
        { status: 400 }
      );
    }

    const clobPayload = {
      deferExec: false,
      order: flatOrder,
      owner: userCreds.key,
      orderType: "GTC",
    };
    const clobBody = JSON.stringify(clobPayload);

    const now = Date.now();
    const builderTimestamp = now;

    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      builderTimestamp,
      "POST",
      "/order",
      clobBody
    );

    console.log("[ORDER PROXY] Sending order", {
      owner: userCreds.key,
      hasSecret: !!userCreds.secret,
      hasPassphrase: !!userCreds.passphrase,
      bodyLen: clobBody.length,
    });

    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      console.error("[ORDER PROXY] CLOB error", {
        status: clobResponse.status,
        text: responseText.slice(0, 300),
      });

      const isBlock =
        responseText.includes("Cloudflare") ||
        responseText.includes("blocked");
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
    console.error("Order proxy error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Failed" },
      { status: 500 }
    );
  }
}
