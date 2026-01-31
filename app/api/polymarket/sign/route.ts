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
    POLY_BUILDER_SIGNATURE: signature,
    POLY_BUILDER_TIMESTAMP: sigTimestamp,
    POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
    POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
  });
}

console.log("BUILDER CREDS", {
  key: BUILDER_CREDENTIALS.key,
  secret: BUILDER_CREDENTIALS.secret ? "SET" : "MISSING",
  passphrase: BUILDER_CREDENTIALS.passphrase ? "SET" : "MISSING",
});
