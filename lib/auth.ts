import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

// npm install @privy-io/server-auth
// Add PRIVY_APP_SECRET to .env

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    if (!token || token.length < 10) return null;
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims.userId;
  } catch {
    return null;
  }
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
