import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  // Optional, not required: every AI feature (Coach, food analysis, appearance
  // analysis) has a defined behavior for "no key configured" — Coach falls
  // back to its deterministic composer, the two analysis actions return a
  // clear "AI unavailable" error — so a missing key degrades the app instead
  // of crashing its boot.
  GEMINI_API_KEY: z.string().min(1).optional(),
  // Guards the manual plan-activation endpoint (app/api/admin/activate-plan).
  // Optional, and the route 404s when it is unset: an admin door with no lock
  // must not exist at all, so a deploy that forgets this variable fails closed
  // rather than shipping an open one. Minimum length is a real constraint
  // here — this is the only secret in the app that grants paid tiers.
  ADMIN_SECRET: z.string().min(16).optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ADMIN_SECRET: process.env.ADMIN_SECRET,
});
