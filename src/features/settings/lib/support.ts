import { PLAN_LABELS } from "@/features/settings/lib/plans";
import type { PlanId } from "@/features/settings/types";
import type { SettingsAccount } from "@/features/settings/types";

/**
 * Buying a tier by talking to a human, until a payment provider is wired.
 *
 * The whole purchase flow is one deep link: it opens the support chat with the
 * message already written, so the user sends it in one tap and we receive
 * something we can act on without a round of "what's your username?". That
 * matters more than it looks — a manual activation costs one message each way
 * only if the first message already identifies the account and the tier.
 */

/** The account that activates PLUS by hand. */
export const SUPPORT_USERNAME = "nheavyy";

/**
 * The user's own handle, as support should search for it.
 *
 * Username first because it is what a chat shows, with the numeric Telegram id
 * as the fallback every account has — findPlanTarget accepts either, so
 * whichever ends up in the message is enough to activate from.
 */
export function accountHandle(account: SettingsAccount): string {
  return account.username ? `@${account.username}` : `ID ${account.telegramId}`;
}

/**
 * A t.me link to the support chat with the request pre-filled.
 *
 * `?text=` is what makes Telegram open the chat with a draft already in the
 * input. It is a draft, not a sent message — the user still reads it and taps
 * send, which is the right amount of friction for something that starts a
 * payment conversation.
 */
export function planRequestLink(plan: PlanId, account: SettingsAccount): string {
  const text = `Здравствуйте! Хочу оформить ${PLAN_LABELS[plan]}.\nМой аккаунт: ${accountHandle(account)}`;
  return `https://t.me/${SUPPORT_USERNAME}?text=${encodeURIComponent(text)}`;
}
