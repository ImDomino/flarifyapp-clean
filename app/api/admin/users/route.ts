import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { isAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!(await isAdmin(userId))) return forbiddenResponse();

    const supabase = createServiceClient();

    const search = request.nextUrl.searchParams.get("search") || "";

    let query = supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .order("username", { ascending: true })
      .limit(50);

    if (search.trim()) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    console.error("Error in admin/users:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
