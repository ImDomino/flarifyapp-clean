import { NextResponse } from "next/server";

// In-memory rate limiter. For production swap to @upstash/ratelimit + Redis.
interface Entry { count: number; resetAt: number; }
const store = new Map<string, Entry>();
setInterval(() => { const now = Date.now(); for (const [k, v] of store) { if (now > v.resetAt) store.delete(k); } }, 5 * 60_000);

function check(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now > e.resetAt) { store.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (e.count >= max) return false;
  e.count++;
  return true;
}

export const RL = {
  createPost:    (uid: string) => check(`post:${uid}`, 10, 60_000),
  createComment: (uid: string) => check(`comment:${uid}`, 20, 60_000),
  toggleLike:    (uid: string) => check(`like:${uid}`, 30, 60_000),
  toggleFollow:  (uid: string) => check(`follow:${uid}`, 20, 60_000),
  updateProfile: (uid: string) => check(`profile:${uid}`, 5, 60_000),
  upload:        (uid: string) => check(`upload:${uid}`, 10, 60_000),
  placeOrder:    (uid: string) => check(`order:${uid}`, 10, 60_000),
  // Public read endpoints — IP-based
  readPublic:    (ip: string)  => check(`pub:${ip}`, 60, 60_000),
  // Authenticated write endpoints
  toggleAlert:   (uid: string) => check(`alert:${uid}`, 15, 60_000),
  toggleWatch:   (uid: string) => check(`watch:${uid}`, 20, 60_000),
};

export function rateLimitResponse() {
  return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
}
