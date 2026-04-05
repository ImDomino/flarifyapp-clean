import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';
import { validatePostContent } from '@/lib/validate';
import { RL, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Extract user_id from JWT, not from request body
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.createPost(userId)) return rateLimitResponse();

    const body = await request.json();
    const { content, image_url, polymarket_market_id, market_data } = body;

    // Validate content
    const v = validatePostContent(content);
    if (!v.valid) return v.error!;

    const supabase = createServiceClient();

    // Ensure profile exists (fallback if ProfileSync didn't run yet)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: '',
          username: `user_${userId.slice(-6)}`,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Failed to auto-create profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }

    const postData: Record<string, any> = {
      content: v.content,
      user_id: userId, // from JWT, not body
    };

    if (image_url) postData.image_url = image_url;
    if (polymarket_market_id) postData.polymarket_market_id = polymarket_market_id;
    if (market_data) {
      postData.market_data = market_data;
      if (market_data.yesTokenId) postData.yes_token_id = market_data.yesTokenId;
      if (market_data.noTokenId) postData.no_token_id = market_data.noTokenId;
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      throw error;
    }

    // Auto-engagement: add 3-8 likes from seed accounts (non-blocking)
    try {
      autoEngage(supabase, post.id, userId).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}

/**
 * Auto-engagement: schedule 3-8 likes from seed profiles over 24h.
 * Likes are saved to `scheduled_likes` table and executed by a cron endpoint.
 */
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

async function autoEngage(supabase: any, postId: string, authorId: string) {
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

  await supabase.from("scheduled_likes").insert(rows);
}
