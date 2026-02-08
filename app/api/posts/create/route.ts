import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, user_id, image_url, polymarket_market_id, market_data } = body;

    if (!content || !user_id) {
      return NextResponse.json(
        { error: 'Missing content or user_id' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Ensure profile exists (fallback if ProfileSync didn't run yet)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .maybeSingle();

    if (!existingProfile) {
      console.log('⚡ Auto-creating profile for user:', user_id);
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user_id,
          email: '',
          username: `user_${user_id.slice(-6)}`,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('❌ Failed to auto-create profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        );
      }
    }

    const postData: Record<string, any> = {
      content,
      user_id,
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

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create post' },
      { status: 500 }
    );
  }
}
