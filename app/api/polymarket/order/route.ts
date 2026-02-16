import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { getCredsFromCookie } from "@/app/api/polymarket/credentials/route";

export const runtime = "nodejs";
export const preferredRegion = "dub1"; // Dublin — не заблокирован Polymarket

const COOKIE_NAME = "pm_creds";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

/**
 * Helper: create a response that also clears the pm_creds cookie
 */
function clearCredsResponse(body: object, status: number): NextResponse {
  const res = NextResponse.json(body, { status });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth check ──
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.placeOrder(userId)) return rateLimitResponse();

    // ── Parse body ──
    const body = await request.json();
    const { signedOrder, eoaAddress } = body;

    if (!signedOrder || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing required fields (signedOrder, eoaAddress)" },
        { status: 400 }
      );
    }

    // ── Get user CLOB credentials from HttpOnly cookie ──
    const userCreds = getCredsFromCookie(request);
    if (!userCreds) {
      return NextResponse.json(
        {
          error: "Trading credentials not found. Please try again.",
          code: "CREDS_MISSING",
        },
        { status: 401 }
      );
    }

    // ── Normalize signed order structure ──
    // SDK may return { salt, maker, signature, ... } directly
    // or wrapped as { order: { salt, ... }, signature }
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

    // ── Build CLOB payload ──
    const clobPayload = {
      deferExec: false,
      order: flatOrder,
      owner: userCreds.key,
      orderType: "GTC",
    };
    const clobBody = JSON.stringify(clobPayload);

    // ── Builder HMAC signature ──
    const builderTimestamp = Date.now();
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      builderTimestamp,
      "POST",
      "/order",
      clobBody
    );

    console.log("[ORDER] Sending to CLOB", {
      owner: userCreds.key.slice(0, 12) + "...",
      maker: flatOrder.maker?.slice(0, 10) + "...",
      bodyLen: clobBody.length,
    });

    // ── Send to Polymarket CLOB ──
    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // User credentials
        POLY_API_KEY: userCreds.key,
        POLY_PASSPHRASE: userCreds.passphrase,
        POLY_SECRET: userCreds.secret,
        // Builder credentials (HMAC signed)
        POLY_BUILDER_SIGNATURE: builderSignature,
        POLY_BUILDER_TIMESTAMP: builderTimestamp.toString(),
        POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
        POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
      },
      body: clobBody,
    });

    const responseText = await clobResponse.text();

    // ── Handle CLOB errors ──
    if (!clobResponse.ok) {
      console.error("[ORDER] CLOB error", {
        status: clobResponse.status,
        body: responseText.slice(0, 500),
      });

      // 401 = invalid/expired user API credentials
      if (
        clobResponse.status === 401 ||
        responseText.includes("Invalid api key") ||
        responseText.includes("Unauthorized")
      ) {
        // Clear the stale cookie so client creates fresh creds on next try
        return clearCredsResponse(
          {
            error: "Invalid API credentials. Please try again.",
            code: "INVALID_CREDS",
          },
          401
        );
      }

      // Cloudflare geo-block
      if (responseText.includes("Cloudflare") || responseText.includes("blocked")) {
        return NextResponse.json(
          {
            error: "Blocked by Cloudflare geo-restriction",
            details: "The trading server cannot reach Polymarket from this region.",
          },
          { status: 403 }
        );
      }

      // Other CLOB errors (insufficient balance, invalid price, etc.)
      return NextResponse.json(
        {
          error: "Order rejected by Polymarket",
          details: responseText.slice(0, 500),
        },
        { status: clobResponse.status }
      );
    }

    // ── Success ──
    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ result: responseText });
    }
  } catch (error: any) {
    console.error("[ORDER] Proxy error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}