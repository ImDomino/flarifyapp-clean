import { NextRequest, NextResponse } from "next/server";
import {
  BuilderApiKeyCreds,
  buildHmacSignature,
} from "@polymarket/builder-signing-sdk";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLY_BUILDER_API_KEY!,
  secret: process.env.POLY_BUILDER_SECRET!,
  passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
};

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { method, path, body } = requestBody;

    console.log("🔍 SIGN DEBUG:");
    console.log("  method:", method);
    console.log("  path:", path);
    console.log("  body type:", typeof body);
    console.log("  body length:", typeof body === "string" ? body.length : "N/A");
    console.log("  body preview:", typeof body === "string" ? body.slice(0, 200) : JSON.stringify(body)?.slice(0, 200));
    console.log("  builder key:", BUILDER_CREDENTIALS.key?.slice(0, 12) + "...");

    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      method || "POST",
      path || "/order",
      body || ""
    );

    console.log("  ✅ Signature:", signature.slice(0, 20) + "...");

    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
      POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
    });
  } catch (error) {
    console.error("❌ Sign endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to generate signature" },
      { status: 500 }
    );
  }
}
