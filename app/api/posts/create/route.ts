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
