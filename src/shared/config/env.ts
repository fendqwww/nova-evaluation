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
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
});
