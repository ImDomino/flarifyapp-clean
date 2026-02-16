import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { getCredsFromCookie } from "@/app/api/polymarket/credentials/route";
import crypto from "crypto";

export const runtime = "nodejs";
export const preferredRegion = "dub1";

const COOKIE_NAME = "pm_creds";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

/**
 * L2 HMAC signature for user credentials.
 * Format: HMAC-SHA256(base64decode(secret), timestamp + method + path + body)
 * Result: base64 string
 *
 * THIS WAS IN THE ORIGINAL WORKING CODE but got removed during security refactor.
 * Without it CLOB returns 401 "Invalid api key".
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
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.placeOrder(userId)) return rateLimitResponse();

    const body = await request.json();
    const { signedOrder, eoaAddress } = body;

    if (!signedOrder || !eoaAddress) {
      return NextResponse.json(
        { error: "Missing required fields (signedOrder, eoaAddress)" },
        { status: 400 }
      );
    }

    // Credentials from encrypted HttpOnly cookie (not from request body)
    const userCreds = getCredsFromCookie(request);
    if (!userCreds) {
      return NextResponse.json(
        { error: "Trading credentials not found. Please try again.", code: "CREDS_MISSING" },
        { status: 401 }
      );
    }

    // Normalize signed order structure
    let flatOrder: any;
    if (signedOrder.salt && signedOrder.maker && signedOrder.signature) {
      flatOrder = signedOrder;
    } else if (signedOrder.order?.salt) {
      flatOrder = signedOrder.order;
    } else {
      return NextResponse.json({ error: "Invalid signed order structure" }, { status: 400 });
    }

    const clobPayload = {
      deferExec: false,
      order: flatOrder,
      owner: userCreds.key,
      orderType: "GTC",
    };
    const clobBody = JSON.stringify(clobPayload);

    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000);   // seconds for L2 HMAC
    const builderTimestamp = now;                     // ms for builder HMAC

    // L2 User HMAC (was missing after refactor — caused all 401s)
    const userSignature = buildL2HmacSignature(
      userCreds.secret, userTimestamp, "POST", "/order", clobBody
    );

    // Builder HMAC
    const builderSignature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret, builderTimestamp, "POST", "/order", clobBody
    );

    console.log("[ORDER] →", {
      owner: userCreds.key.slice(0, 12) + "...",
      maker: flatOrder.maker?.slice(0, 10) + "...",
      eoa: eoaAddress.slice(0, 10) + "...",
    });

    const clobResponse = await fetch("https://clob.polymarket.com/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ── User L2 auth (RESTORED) ──
        POLY_ADDRESS: eoaAddress,
        POLY_SIGNATURE: userSignature,
        POLY_TIMESTAMP: userTimestamp.toString(),
        POLY_API_KEY: userCreds.key,
        POLY_PASSPHRASE: userCreds.passphrase,
        // ── Builder auth ──
        POLY_BUILDER_SIGNATURE: builderSignature,
        POLY_BUILDER_TIMESTAMP: builderTimestamp.toString(),
        POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
        POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
      },
      body: clobBody,
    });

    const responseText = await clobResponse.text();

    if (!clobResponse.ok) {
      console.error("[ORDER] CLOB error", {
        status: clobResponse.status,
        body: responseText.slice(0, 500),
      });

      if (
        clobResponse.status === 401 ||
        responseText.includes("Invalid api key") ||
        responseText.includes("Unauthorized")
      ) {
        return clearCredsResponse(
          { error: "Trading credentials expired. Please try again.", code: "INVALID_CREDS" },
          401
        );
      }

      if (responseText.includes("Cloudflare") || responseText.includes("blocked")) {
        return NextResponse.json(
          { error: "Blocked by Cloudflare geo-restriction" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Order rejected", details: responseText.slice(0, 500) },
        { status: clobResponse.status }
      );
    }

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ result: responseText });
    }
  } catch (error: any) {
    console.error("[ORDER] Error:", error?.message);
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}