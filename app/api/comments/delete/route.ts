import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { isValidUUID } from "@/lib/validate";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { comment_id } = await request.json();
    if (!comment_id || !isValidUUID(comment_id))
      return NextResponse.json({ error: "Invalid comment_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { data: comment } = await supabase
      .from("comments").select("user_id").eq("id", comment_id).single();

    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (comment.user_id !== userId) return forbiddenResponse("Not your comment");

    const { error } = await supabase.from("comments").delete().eq("id", comment_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete comment error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
