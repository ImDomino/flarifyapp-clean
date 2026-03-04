import { createServiceClient } from "@/lib/supabase/server";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I
const CODE_LENGTH = 6;
const CODES_PER_USER = 5;

function generateCode(): string {
  const body = Array.from({ length: CODE_LENGTH }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
  return `FL-${body}`;
}

export async function generateInviteCodesForUser(userId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const codes: string[] = [];

  for (let i = 0; i < CODES_PER_USER; i++) {
    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
    } while (attempts < 10 && codes.includes(code));
    codes.push(code);
  }

  const { error } = await supabase
    .from("invite_codes")
    .insert(codes.map((code) => ({ code, owner_id: userId })));

  if (error) {
    console.error("Failed to generate invite codes:", error);
    throw new Error("Failed to generate invite codes");
  }

  return codes;
}
