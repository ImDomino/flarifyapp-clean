import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { getCredsFromCookie } from "../route";

/**
 * GET /api/polymarket/credentials/retrieve
 *
 * Returns decrypted credentials from HttpOnly cookie.
 *
 * SECURITY NOTES:
 * - Requires valid Privy JWT Bearer token (auth check)
 * - Credentials are returned to the authenticated client so it can
 *   initialize ClobClient in-memory without a Privy signing prompt
 * - This is safe because:
 *   a) The cookie is HttpOnly — XSS cannot read it directly
 *   b) This endpoint requires a valid auth token — XSS would need
 *      the Privy token too (which is also not in cookies, it's in memory)
 *   c) SameSite=Strict prevents CSRF
 * - The client holds creds in JS memory only during the session
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const creds = getCredsFromCookie(request);
    if (!creds) {
      return NextResponse.json(
        { error: "No stored credentials" },
        { status: 404 }
      );
    }

    // Return credentials to authenticated client
    return NextResponse.json({
      key: creds.key,
      secret: creds.secret,
      passphrase: creds.passphrase,
    });
  } catch (error: any) {
    console.error("Credentials retrieve error:", error?.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
