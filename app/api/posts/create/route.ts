import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth';
import { validatePostContent } from '@/lib/validate';
import { RL, rateLimitResponse } from '@/lib/rate-limit';
import { autoEngage } from '@/lib/auto-engage';

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

    // Auto-engagement: schedule 3-8 likes from seed accounts
    try {
      await autoEngage(post.id, userId);
    } catch (engageErr) {
      console.error("Auto-engage error:", engageErr);
    }

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
