import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png":  [0x89, 0x50, 0x4e, 0x47],
  "image/gif":  [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
};

function checkMagicBytes(buffer: ArrayBuffer, mime: string): boolean {
  const expected = MAGIC_BYTES[mime];
  if (!expected) return false;
  const bytes = new Uint8Array(buffer);
  return expected.every((b, i) => bytes[i] === b);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.upload(userId)) return rateLimitResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    // Size check
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    // MIME type check
    if (!ALLOWED_MIME.includes(file.type))
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP allowed" }, { status: 400 });

    // Magic bytes check
    const arrayBuffer = await file.arrayBuffer();
    if (!checkMagicBytes(arrayBuffer, file.type))
      return NextResponse.json({ error: "File content doesn't match type" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt) ? fileExt : "jpg";
    const fileName = `${userId}/${Date.now()}.${safeExt}`;
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return NextResponse.json({ success: true, url: urlData.publicUrl, path: fileName });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
