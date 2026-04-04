import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50MB

const IMAGE_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_MIME = [...IMAGE_MIME, ...VIDEO_MIME];

const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png":  [0x89, 0x50, 0x4e, 0x47],
  "image/gif":  [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  // MP4/MOV use ftyp box — bytes 4-7 are "ftyp"
  "video/mp4":       [0x00, 0x00], // relaxed — checked via ftyp below
  "video/quicktime": [0x00, 0x00],
  "video/webm":      [0x1a, 0x45, 0xdf, 0xa3],
};

function checkMagicBytes(buffer: ArrayBuffer, mime: string): boolean {
  const bytes = new Uint8Array(buffer);

  // MP4/MOV: check for "ftyp" at offset 4
  if (mime === "video/mp4" || mime === "video/quicktime") {
    if (bytes.length < 8) return false;
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    return ftyp === "ftyp";
  }

  const expected = MAGIC_BYTES[mime];
  if (!expected) return false;
  return expected.every((b, i) => bytes[i] === b);
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp"];
const VIDEO_EXTS = ["mp4", "webm", "mov"];

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.upload(userId)) return rateLimitResponse();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const isVideo = VIDEO_MIME.includes(file.type);
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize)
      return NextResponse.json(
        { error: `File too large (max ${isVideo ? "50MB" : "5MB"})` },
        { status: 400 }
      );

    if (!ALLOWED_MIME.includes(file.type))
      return NextResponse.json(
        { error: "Supported: JPEG, PNG, GIF, WebP, MP4, WebM, MOV" },
        { status: 400 }
      );

    const arrayBuffer = await file.arrayBuffer();
    if (!checkMagicBytes(arrayBuffer, file.type))
      return NextResponse.json({ error: "File content doesn't match type" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileExt = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
    const allowedExts = [...IMAGE_EXTS, ...VIDEO_EXTS];
    const safeExt = allowedExts.includes(fileExt) ? fileExt : (isVideo ? "mp4" : "jpg");
    const fileName = `${userId}/${Date.now()}.${safeExt}`;
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      type: isVideo ? "video" : "image",
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
