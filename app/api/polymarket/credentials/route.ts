import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import crypto from "crypto";

/**
 * /api/polymarket/credentials
 *
 * Secure server-side storage for Polymarket User API credentials.
 * Credentials are stored in encrypted HttpOnly cookies — never in localStorage.
 *
 * GET  — returns { hasCreds: boolean } (never returns actual creds to client)
 * POST — stores encrypted credentials in HttpOnly cookie
 * DELETE — clears stored credentials
 */

const COOKIE_NAME = "pm_creds";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

// Encryption key derived from PRIVY_APP_SECRET (or dedicated env var)
function getEncryptionKey(): Buffer {
  const secret = process.env.POLYMARKET_CREDS_SECRET || process.env.PRIVY_APP_SECRET;
  if (!secret) throw new Error("Missing encryption secret");
  // Derive a 32-byte key from the secret
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Extract credentials from cookie (server-side only).
 * Exported for use by other API routes (e.g., /api/polymarket/order).
 */
export function getCredsFromCookie(
  request: NextRequest
): { key: string; secret: string; passphrase: string } | null {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    const decrypted = decrypt(cookie.value);
    const parsed = JSON.parse(decrypted);
    if (parsed.key && parsed.secret && parsed.passphrase) return parsed;
    return null;
  } catch {
    return null;
  }
}

// GET — check if credentials exist (never returns actual creds)
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const creds = getCredsFromCookie(request);
    return NextResponse.json({ hasCreds: !!creds });
  } catch (error: any) {
    console.error("Credentials GET error:", error?.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST — store credentials in encrypted HttpOnly cookie
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { key, secret, passphrase } = body;

    if (!key || !secret || !passphrase) {
      return NextResponse.json(
        { error: "Missing key, secret, or passphrase" },
        { status: 400 }
      );
    }

    // Basic validation — Polymarket API keys have specific formats
    if (typeof key !== "string" || key.length < 5) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
    }

    // Encrypt and store in HttpOnly cookie
    const encrypted = encrypt(JSON.stringify({ key, secret, passphrase }));

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error: any) {
    console.error("Credentials POST error:", error?.message);
    return NextResponse.json({ error: "Failed to store credentials" }, { status: 500 });
  }
}

// DELETE — clear stored credentials
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error: any) {
    console.error("Credentials DELETE error:", error?.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
