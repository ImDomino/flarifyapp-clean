import { NextResponse } from "next/server";

export function sanitizeText(input: unknown, maxLength: number): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/\0/g, "").slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

export function validatePostContent(content: unknown) {
  const s = sanitizeText(content, 500);
  if (!s) return { valid: false as const, error: NextResponse.json({ error: "Content required, max 500 chars" }, { status: 400 }) };
  return { valid: true as const, content: s };
}

export function validateCommentContent(content: unknown) {
  const s = sanitizeText(content, 500);
  if (!s) return { valid: false as const, error: NextResponse.json({ error: "Comment required, max 500 chars" }, { status: 400 }) };
  return { valid: true as const, content: s };
}

export function isValidUUID(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isValidUserId(id: unknown): boolean {
  if (typeof id !== "string") return false;
  if (id.startsWith("did:privy:") && id.length > 12 && id.length < 60) return true;
  return isValidUUID(id);
}
