/**
 * The one place the support channel is written down.
 *
 * Before this file the app had three answers to "где поддержка?" — the landing
 * constants, settings/lib/about.ts and settings/lib/support.ts — and they
 * disagreed: two pointed at a bot handle that did not exist yet and the third
 * at a personal account. Every one of them now re-exports from here, so
 * changing the channel is a one-line edit in one file.
 *
 * Это бот ТОЛЬКО для обращений: вопросы, ошибки, запрос платного тарифа. Вход
 * в приложение — другой бот, см. shared/config/app-bot.ts. Смешивать их нельзя
 * ни в одну сторону.
 *
 * This module is deliberately free of `server-only` and of any env access: it
 * is imported by client components (the landing nav, the plan card, the
 * settings row) and must survive the client bundle. The bot's *token* is a
 * server secret and lives in env; the bot's *username* is public — it is
 * printed on a button.
 */

/**
 * The support bot's Telegram username, without the @.
 *
 * This is the bot the webhook in app/api/telegram/support is wired to, and it
 * is deliberately a bot rather than a person's account: a human handle cannot
 * open a ticket, cannot be handed over, and cannot be revoked when that person
 * leaves.
 */
export const TELEGRAM_SUPPORT_BOT_USERNAME = "evaluationsupport_bot";

/** What every "Поддержка" button in the app opens. */
export const TELEGRAM_SUPPORT_URL = `https://t.me/${TELEGRAM_SUPPORT_BOT_USERNAME}`;

/** The same channel as it is printed in copy. */
export const TELEGRAM_SUPPORT_HANDLE = `@${TELEGRAM_SUPPORT_BOT_USERNAME}`;

/**
 * A t.me link that starts the bot with a payload already attached.
 *
 * Telegram delivers the payload as `/start <payload>`, which lets a button in
 * the app open the bot with the conversation already routed — the subscription
 * screen uses it to land the user straight in the "оплата" category instead of
 * making them pick it from the menu after they already said what they wanted.
 *
 * Telegram accepts only `A-Za-z0-9_-`, up to 64 characters, and silently drops
 * anything else, so the payload is sanitised rather than trusted. An empty
 * result degrades to the plain link instead of producing a broken one.
 */
export function supportDeepLink(payload: string): string {
  const safe = payload.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return safe ? `${TELEGRAM_SUPPORT_URL}?start=${safe}` : TELEGRAM_SUPPORT_URL;
}
