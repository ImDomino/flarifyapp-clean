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
  const { method, path, body } = await request.json();
  const sigTimestamp = Date.now().toString();

  const signature = buildHmacSignature(
    BUILDER_CREDENTIALS.secret,
    parseInt(sigTimestamp),
    method,
    path,
    body
  );

  return NextResponse.json({
  ok: true,
  ENV: {
    key: !!BUILDER_CREDENTIALS.key,
    secret: !!BUILDER_CREDENTIALS.secret,
    passphrase: !!BUILDER_CREDENTIALS.passphrase,
  },
});
}

