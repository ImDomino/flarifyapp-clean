import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { getCredsFromCookie } from "@/app/api/polymarket/credentials/route";

/**
 * GET /api/polymarket/credentials/retrieve
 *
 * Returns decrypted credentials from HttpOnly cookie.
 * Only accessible to authenticated users.
 * Used by useUserApiCredentials to load creds without re-deriving.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const creds = getCredsFromCookie(request);
    if (!creds) {
      return NextResponse.json({ hasCreds: false }, { status: 404 });
    }

    return NextResponse.json({
      key: creds.key,
      secret: creds.secret,
      passphrase: creds.passphrase,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}