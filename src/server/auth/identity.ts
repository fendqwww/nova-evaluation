import "server-only";
import { verifyTelegramInitData } from "./telegram";
import type { TelegramIdentity } from "./types";

// The one stand-in user for local development. Both dev entry points
// converge on it: the client bootstrap signs this user into a real initData
// string (see dev-mock.ts), and the fallback in resolveIdentity() below
// answers with it directly when a browser reaches a Server Action carrying
// no initData at all.
export const DEV_TELEGRAM_USER = {
  id: 999000001,
  first_name: "Иван",
  username: "nova_dev",
  language_code: "ru",
} as const;

const DEV_IDENTITY: TelegramIdentity = {
  telegramId: String(DEV_TELEGRAM_USER.id),
  firstName: DEV_TELEGRAM_USER.first_name,
  username: DEV_TELEGRAM_USER.username,
  languageCode: DEV_TELEGRAM_USER.language_code,
};

// Every Server Action answers "who is calling?" here and nowhere else, so
// this stays the only module aware that development has a stand-in user.
// Outside Telegram there is no initData to verify — in development that
// resolves to DEV_IDENTITY, in production it is an auth failure.
export function resolveIdentity(
  rawInitData: string | undefined,
): TelegramIdentity {
  if (rawInitData) {
    return verifyTelegramInitData(rawInitData);
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_IDENTITY;
  }

  throw new Error("TELEGRAM_AUTH_INVALID");
}
