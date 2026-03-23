import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";
import { validatePostContent } from "@/lib/validate";

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAuthenticatedUser(request);
    if (!adminUserId) return unauthorizedResponse();
    if (!(await isAdmin(adminUserId))) return forbiddenResponse();

    const body = await request.json();
    const { target_user_id, content, image_url, polymarket_market_id, market_data } = body;

    if (!target_user_id) {
      return NextResponse.json({ error: "target_user_id is required" }, { status: 400 });
    }

    // Validate content
    const v = validatePostContent(content);
    if (!v.valid) return v.error!;

    const supabase = createServiceClient();

    // Verify target user exists
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", target_user_id)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const postData: Record<string, any> = {
      content: v.content,
      user_id: target_user_id,
    };

    if (image_url) postData.image_url = image_url;
    if (polymarket_market_id) postData.polymarket_market_id = polymarket_market_id;
    if (market_data) {
      postData.market_data = market_data;
      if (market_data.yesTokenId) postData.yes_token_id = market_data.yesTokenId;
      if (market_data.noTokenId) postData.no_token_id = market_data.noTokenId;
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error("Error creating admin post:", error);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    return NextResponse.json({ success: true, post, targetUsername: targetUser.username });
  } catch (error: any) {
    console.error("Error in admin/create-post:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
