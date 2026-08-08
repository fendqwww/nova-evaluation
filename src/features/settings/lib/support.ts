import {
  TELEGRAM_SUPPORT_BOT_USERNAME,
  TELEGRAM_SUPPORT_URL,
  supportDeepLink,
} from "@/shared/config/support";
import type { PlanId } from "@/features/settings/types";
import type { SettingsAccount } from "@/features/settings/types";

/**
 * Buying a tier by talking to a human, until a payment provider is wired.
 *
 * This used to open a chat with a personal account and a `?text=` draft the
 * user had to send themselves. It now opens the support bot with a deep-link
 * payload, which is better in the two ways that were the point of the draft:
 *
 *   - The bot already knows who is writing. Telegram hands it the user's id
 *     and username with the very first update, so the "какой у вас аккаунт?"
 *     round trip the pre-filled text existed to avoid is gone for good —
 *     including for users with no @username, whose draft was the only thing
 *     identifying them.
 *   - The request becomes a ticket with a number instead of a message in
 *     someone's personal inbox, so it survives that person being asleep.
 *
 * A person's handle also could not be revoked, reassigned, or answered by a
 * second engineer. A bot can.
 */

/** The account that activates a paid tier. A bot, not a person. */
export const SUPPORT_USERNAME = TELEGRAM_SUPPORT_BOT_USERNAME;

/** Plain link to the support bot, with no branch preselected. */
export const SUPPORT_LINK = TELEGRAM_SUPPORT_URL;

/**
 * The user's own handle, as support should search for it.
 *
 * Username first because it is what a chat shows, with the numeric Telegram id
 * as the fallback every account has — findPlanTarget accepts either, so
 * whichever ends up in front of support is enough to activate from. Still
 * rendered on the subscription screen: the bot knows this already, but the
 * user seeing their own handle is how they know we will find them.
 */
export function accountHandle(account: SettingsAccount): string {
  return account.username ? `@${account.username}` : `ID ${account.telegramId}`;
}

/**
 * A link that opens the support bot already on the payment branch.
 *
 * `?start=plan_plus` is delivered to the bot as `/start plan_plus`, which its
 * user flow maps onto the "💳 Оплата" category (see categoryFromPayload in
 * features/support/server/user-flow.ts). The user taps the button and is asked
 * for their question directly, instead of being shown a seven-item menu that
 * asks what they just told us by pressing "Получить PLUS".
 *
 * It no longer takes the account. The pre-filled draft needed it to spell out
 * who was asking; the bot is told that by Telegram on the first update, so
 * passing it here would be a parameter that exists only to be ignored.
 */
export function planRequestLink(plan: PlanId): string {
  return supportDeepLink(`plan_${plan}`);
}
