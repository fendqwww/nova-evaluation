"use server";

import { sign } from "@tma.js/init-data-node";
import { env } from "@/shared/config/env";
import { DEV_TELEGRAM_USER } from "@/server/auth/identity";

// Lets the whole Telegram -> onboarding -> Dashboard journey be exercised
// from a plain browser during `npm run dev`. Signed with the same
// TELEGRAM_BOT_TOKEN the server verifies against, so it round-trips through
// the exact same code path as a real Telegram launch. When this bootstrap
// cannot run, resolveIdentity() still recognises the same user from the
// absence of initData — see src/server/auth/identity.ts.
export async function getDevMockInitData(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dev mock init data is unavailable in production");
  }

  return sign({ user: { ...DEV_TELEGRAM_USER } }, env.TELEGRAM_BOT_TOKEN, new Date());
}
