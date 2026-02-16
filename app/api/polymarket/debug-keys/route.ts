import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { getCredsFromCookie } from "@/app/api/polymarket/credentials/route";

export const runtime = "nodejs";
export const preferredRegion = "dub1";

/**
 * POST /api/polymarket/debug-keys
 *
 * Debug endpoint to check what API keys exist on Polymarket's side
 * and optionally delete them.
 *
 * Accepts: { action: "list" | "delete", eoaAddress: string }
 *
 * For "list": calls GET /auth/api-keys to see current keys
 * For "delete": calls DELETE /auth/api-key to remove all keys
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const userCreds = getCredsFromCookie(request);
    const body = await request.json();
    const { action = "list", eoaAddress } = body;

    if (!eoaAddress) {
      return NextResponse.json({ error: "Missing eoaAddress" }, { status: 400 });
    }

    const results: any = { action, eoaAddress };

    if (action === "list" && userCreds) {
      // Try to list API keys using current credentials
      try {
        const res = await fetch("https://clob.polymarket.com/auth/api-keys", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            POLY_ADDRESS: eoaAddress,
            POLY_API_KEY: userCreds.key,
            POLY_PASSPHRASE: userCreds.passphrase,
            POLY_SECRET: userCreds.secret,
          },
        });
        const text = await res.text();
        results.listStatus = res.status;
        results.listResponse = text.slice(0, 1000);
      } catch (e: any) {
        results.listError = e.message;
      }
    }

    if (action === "delete" && userCreds) {
      // Delete current API key
      try {
        const res = await fetch("https://clob.polymarket.com/auth/api-key", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            POLY_ADDRESS: eoaAddress,
            POLY_API_KEY: userCreds.key,
            POLY_PASSPHRASE: userCreds.passphrase,
            POLY_SECRET: userCreds.secret,
          },
        });
        const text = await res.text();
        results.deleteStatus = res.status;
        results.deleteResponse = text.slice(0, 1000);
      } catch (e: any) {
        results.deleteError = e.message;
      }
    }

    // Also report cookie state
    results.hasCreds = !!userCreds;
    results.credsKey = userCreds?.key?.slice(0, 12) + "..." || "none";

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}