import { createServiceClient } from "@/lib/supabase/server";

const SEED_PREFIX = "seed:flarify:";
const SEED_PROFILES = [
  { id: `${SEED_PREFIX}0`,  username: "polytrader",     name: "Poly Trader" },
  { id: `${SEED_PREFIX}1`,  username: "marketmind",     name: "Market Mind" },
  { id: `${SEED_PREFIX}2`,  username: "riskrunner",     name: "Risk Runner" },
  { id: `${SEED_PREFIX}3`,  username: "signalfinder",   name: "Signal Finder" },
  { id: `${SEED_PREFIX}4`,  username: "oddsmaker_",     name: "Odds Maker" },
  { id: `${SEED_PREFIX}5`,  username: "betabreaker",    name: "Beta Breaker" },
  { id: `${SEED_PREFIX}6`,  username: "edgeseeker",     name: "Edge Seeker" },
  { id: `${SEED_PREFIX}7`,  username: "probpilot",      name: "Prob Pilot" },
  { id: `${SEED_PREFIX}8`,  username: "yesnomaybe",     name: "Yes No Maybe" },
  { id: `${SEED_PREFIX}9`,  username: "sharpbets",      name: "Sharp Bets" },
  { id: `${SEED_PREFIX}10`, username: "calledit_",      name: "Called It" },
  { id: `${SEED_PREFIX}11`, username: "thetradoor",     name: "The Tradoor" },
];

async function ensureSeedProfiles(supabase: any) {
  const ids = SEED_PROFILES.map((p) => p.id);
  const { data } = await supabase.from("profiles").select("id").in("id", ids);

  if (data && data.length >= SEED_PROFILES.length) return ids;

  const existing = new Set((data || []).map((p: any) => p.id));
  const missing = SEED_PROFILES.filter((p) => !existing.has(p.id));

  if (missing.length > 0) {
    await supabase.from("profiles").upsert(
      missing.map((p) => ({
        id: p.id,
        email: `${p.username}@seed.internal`,
        username: p.username,
        display_name: p.name,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "id" }
    );
  }

  return ids;
}

/**
 * Schedule 3-8 likes from seed profiles, spread over 24 hours.
 */
export async function autoEngage(postId: string, authorId: string) {
  const supabase = createServiceClient();
  const seedIds = await ensureSeedProfiles(supabase);

  const count = 3 + Math.floor(Math.random() * 6);
  const shuffled = seedIds
    .filter((id) => id !== authorId)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  const now = Date.now();
  const totalWindow = 24 * 60 * 60 * 1000;

  const rows = shuffled.map((seedId, i) => {
    const minDelay = 5 * 60 * 1000;
    const fraction = (i + 0.5 + Math.random()) / shuffled.length;
    const delay = minDelay + fraction * fraction * totalWindow;
    return {
      post_id: postId,
      user_id: seedId,
      execute_at: new Date(now + delay).toISOString(),
    };
  });

  const { error } = await supabase.from("scheduled_likes").insert(rows);
  if (error) {
    console.error("Failed to schedule likes:", error);
  } else {
    console.log(`Scheduled ${rows.length} likes for post ${postId}`);
  }
}
