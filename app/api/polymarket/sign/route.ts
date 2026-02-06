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
    const rawBody = await request.text();

    const parsed = JSON.parse(rawBody);

    console.log("🔍 SIGN DEBUG:");
    console.log("Raw body len:", rawBody.length);
    console.log("Method:", parsed.method);
    console.log("Path:", parsed.path);
    console.log("Builder key:", BUILDER_CREDENTIALS.key.slice(0, 8));

    const sigTimestamp = Date.now().toString();

    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      parsed.method?.toUpperCase() || "POST",
      parsed.path || "/order",
      rawBody
    );

    console.log("Builder sig:", signature);

    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
    });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    return NextResponse.json(
      { error: "Signature failed" },
      { status: 500 }
    );
  }
}
