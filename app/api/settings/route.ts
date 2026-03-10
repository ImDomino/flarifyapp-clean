import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------ */
/*  Default settings & validation                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    reposts: true,
    messages: true,
    price_alerts: true,
  },
  privacy: {
    show_pnl_public: true,
    show_positions_public: true,
    allow_messages_from: "everyone" as string,
  },
};

type Settings = typeof DEFAULT_SETTINGS;

const VALID_NOTIFICATION_KEYS = new Set<string>(
  Object.keys(DEFAULT_SETTINGS.notifications)
);

const VALID_PRIVACY_KEYS = new Set<string>(
  Object.keys(DEFAULT_SETTINGS.privacy)
);

const VALID_ALLOW_MESSAGES = new Set(["everyone", "following", "nobody"]);

const VALID_TOP_KEYS = new Set(["notifications", "privacy"]);

/** Deep-merge `patch` into `base`, returning a new object. */
function deepMerge(base: Record<string, any>, patch: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const key of Object.keys(patch)) {
    if (
      typeof base[key] === "object" &&
      base[key] !== null &&
      !Array.isArray(base[key]) &&
      typeof patch[key] === "object" &&
      patch[key] !== null &&
      !Array.isArray(patch[key])
    ) {
      result[key] = deepMerge(base[key], patch[key]);
    } else {
      result[key] = patch[key];
    }
  }
  return result;
}

/**
 * Validate an incoming settings patch. Returns an error string or null.
 * Only known keys with correct types are accepted.
 */
function validatePatch(patch: unknown): string | null {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch))
    return "Settings must be a JSON object";

  const obj = patch as Record<string, unknown>;

  for (const topKey of Object.keys(obj)) {
    if (!VALID_TOP_KEYS.has(topKey))
      return `Unknown settings key: "${topKey}"`;

    const section = obj[topKey];
    if (typeof section !== "object" || section === null || Array.isArray(section))
      return `"${topKey}" must be an object`;

    const sectionObj = section as Record<string, unknown>;

    if (topKey === "notifications") {
      for (const k of Object.keys(sectionObj)) {
        if (!VALID_NOTIFICATION_KEYS.has(k))
          return `Unknown notifications key: "${k}"`;
        if (typeof sectionObj[k] !== "boolean")
          return `notifications.${k} must be a boolean`;
      }
    }

    if (topKey === "privacy") {
      for (const k of Object.keys(sectionObj)) {
        if (!VALID_PRIVACY_KEYS.has(k))
          return `Unknown privacy key: "${k}"`;
        if (k === "allow_messages_from") {
          if (typeof sectionObj[k] !== "string" || !VALID_ALLOW_MESSAGES.has(sectionObj[k] as string))
            return `privacy.allow_messages_from must be one of: ${[...VALID_ALLOW_MESSAGES].join(", ")}`;
        } else {
          if (typeof sectionObj[k] !== "boolean")
            return `privacy.${k} must be a boolean`;
        }
      }
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  GET  /api/settings                                                 */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("settings, show_pnl_public")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    // Merge stored settings over defaults so new keys are always present
    const stored = data?.settings ?? {};
    const settings = deepMerge(DEFAULT_SETTINGS, stored);

    // If settings.privacy.show_pnl_public was never set, use the legacy column
    if (!stored?.privacy?.show_pnl_public && data?.show_pnl_public !== undefined && data?.show_pnl_public !== null) {
      (settings as any).privacy.show_pnl_public = data.show_pnl_public;
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH  /api/settings                                               */
/* ------------------------------------------------------------------ */

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.updateProfile(userId)) return rateLimitResponse();

    const body = await request.json();
    const patch = body?.settings;
    if (!patch)
      return NextResponse.json({ error: "Missing settings object" }, { status: 400 });

    const validationError = validatePatch(patch);
    if (validationError)
      return NextResponse.json({ error: validationError }, { status: 400 });

    const supabase = createServiceClient();

    // Fetch current stored settings
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Deep-merge: defaults -> stored -> incoming patch
    const current = deepMerge(DEFAULT_SETTINGS, existing?.settings ?? {});
    const merged = deepMerge(current, patch) as Settings;

    // Keep profiles.show_pnl_public in sync for backward compatibility
    const updatePayload: Record<string, any> = {
      settings: merged,
      updated_at: new Date().toISOString(),
    };
    if ((merged as any).privacy?.show_pnl_public !== undefined) {
      updatePayload.show_pnl_public = (merged as any).privacy.show_pnl_public;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, settings: merged });
  } catch (error: any) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update settings" }, { status: 500 });
  }
}
