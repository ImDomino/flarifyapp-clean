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
 * L2 HMAC signature — used in the original working code.
 * HMAC-SHA256(base64decode(secret), timestamp + method + path + body)
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
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userCreds = getCredsFromCookie(request);
    if (!userCreds) {
      return NextResponse.json(
        { error: "Trading credentials not found.", code: "CREDS_MISSING" },
        { status: 401 }
      );
    }

    // Normalize signed order
    let flatOrder: any;
    if (signedOrder.salt && signedOrder.maker && signedOrder.signature) {
      flatOrder = signedOrder;
    } else if (signedOrder.order?.salt) {
      flatOrder = signedOrder.order;
    } else {
      return NextResponse.json({ error: "Invalid signed order" }, { status: 400 });
    }

    const clobPayload = {
      deferExec: false,
      order: flatOrder,
      owner: userCreds.key,
      orderType: "GTC",
    };
    const clobBody = JSON.stringify(clobPayload);

    // Timestamps
    const now = Date.now();
    const userTimestamp = Math.floor(now / 1000);
    const builderTimestamp = now;

    // L2 User HMAC
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

    // ══════════════════════════════════════════════════════
    // DETAILED DEBUG LOG — remove after fixing
    // ══════════════════════════════════════════════════════
    console.log("[ORDER] ══════════════════════════════════════");
    console.log("[ORDER] owner (API key):", userCreds.key);
    console.log("[ORDER] eoaAddress (from client body):", eoaAddress);
    console.log("[ORDER] maker (from signed order):", flatOrder.maker);
    console.log("[ORDER] signer (from signed order):", flatOrder.signer);
    console.log("[ORDER] signatureType:", flatOrder.signatureType);
    console.log("[ORDER] secret starts with:", userCreds.secret?.slice(0, 8) + "...");
    console.log("[ORDER] passphrase starts with:", userCreds.passphrase?.slice(0, 8) + "...");
    console.log("[ORDER] userTimestamp:", userTimestamp);
    console.log("[ORDER] userSignature:", userSignature?.slice(0, 20) + "...");
    console.log("[ORDER] builderTimestamp:", builderTimestamp);
    console.log("[ORDER] builder key:", BUILDER_CREDENTIALS.key?.slice(0, 12) + "...");
    console.log("[ORDER] ══════════════════════════════════════");

    // Attempt 1: L2 HMAC auth (original working format)
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

    // If L2 HMAC auth failed with 401, try POLY_SECRET header format
    if (
      clobResponse.status === 401 &&
      (responseText.includes("Invalid api key") || responseText.includes("Unauthorized"))
    ) {
      console.log("[ORDER] L2 HMAC auth failed (401). Trying POLY_SECRET header format...");

      const clobResponse2 = await fetch("https://clob.polymarket.com/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          POLY_API_KEY: userCreds.key,
          POLY_PASSPHRASE: userCreds.passphrase,
          POLY_SECRET: userCreds.secret,
          POLY_BUILDER_SIGNATURE: builderSignature,
          POLY_BUILDER_TIMESTAMP: builderTimestamp.toString(),
          POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
          POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
        },
        body: clobBody,
      });

      const responseText2 = await clobResponse2.text();

      if (!clobResponse2.ok) {
        console.error("[ORDER] POLY_SECRET format also failed:", {
          status: clobResponse2.status,
          body: responseText2.slice(0, 500),
        });

        if (
          clobResponse2.status === 401 ||
          responseText2.includes("Invalid api key")
        ) {
          return clearCredsResponse(
            { error: "Credentials invalid. Please try again.", code: "INVALID_CREDS" },
            401
          );
        }

        return NextResponse.json(
          { error: "Order rejected", details: responseText2.slice(0, 500) },
          { status: clobResponse2.status }
        );
      }

      try {
        return NextResponse.json(JSON.parse(responseText2));
      } catch {
        return NextResponse.json({ result: responseText2 });
      }
    }

    // Handle first attempt errors (non-401)
    if (!clobResponse.ok) {
      console.error("[ORDER] CLOB error:", {
        status: clobResponse.status,
        body: responseText.slice(0, 500),
      });

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

    // Success
    console.log("[ORDER] ✅ Success:", responseText.slice(0, 200));
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