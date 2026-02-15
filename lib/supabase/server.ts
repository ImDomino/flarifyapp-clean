import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using SERVICE_ROLE key.
 * Bypasses RLS — we verify auth ourselves via lib/auth.ts.
 * NEVER import in client code.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env vars");
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
