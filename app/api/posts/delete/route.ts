import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { isValidUUID } from "@/lib/validate";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { post_id } = await request.json();
    if (!post_id || !isValidUUID(post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { data: post } = await supabase
      .from("posts").select("user_id").eq("id", post_id).single();

    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.user_id !== userId) return forbiddenResponse("Not your post");

    const { error } = await supabase.from("posts").delete().eq("id", post_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete post error:", error);
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}
