import "server-only";
import { validate, parse } from "@tma.js/init-data-node";
import { env } from "@/shared/config/env";
import type { TelegramIdentity } from "./types";

// Telegram re-signs `initData` on every Mini App launch, so a tight window
// is safe and limits replay of a leaked value.
const INIT_DATA_MAX_AGE_SECONDS = 3600;

export function verifyTelegramInitData(rawInitData: string): TelegramIdentity {
  try {
    validate(rawInitData, env.TELEGRAM_BOT_TOKEN, {
      expiresIn: INIT_DATA_MAX_AGE_SECONDS,
    });
  } catch {
    throw new Error("TELEGRAM_AUTH_INVALID");
  }

  const parsed = parse(rawInitData);
  if (!parsed.user) {
    throw new Error("TELEGRAM_AUTH_INVALID");
  }

  return {
    telegramId: String(parsed.user.id),
    firstName: parsed.user.first_name,
    lastName: parsed.user.last_name,
    username: parsed.user.username,
    languageCode: parsed.user.language_code,
    photoUrl: parsed.user.photo_url,
  };
}
