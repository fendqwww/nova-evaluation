import { categorySchema } from "../schemas";
import type { SupportCategoryId } from "../types";

/**
 * The callback_data protocol for inline buttons.
 *
 * Telegram caps callback_data at 64 bytes and hands it back verbatim from
 * whoever tapped the button — including someone replaying a payload they saw
 * in a forwarded message. So this is untrusted input with a tight budget, and
 * it is parsed into a closed union here rather than string-matched at four
 * call sites.
 *
 * The wire format is `verb:argument`. Short verbs, no JSON: an action on a
 * six-digit ticket has to fit with room to spare.
 *
 * Note what is *not* encoded here: permission. A payload says "close ticket
 * 42", never "I am allowed to close ticket 42" — the handler re-checks the
 * sender against SUPPORT_ADMIN_IDS every time, because the button's payload is
 * as forgeable as the button.
 */
export type SupportCallback =
  | { kind: "category"; category: SupportCategoryId }
  | { kind: "skip-screenshots" }
  | { kind: "submit" }
  | { kind: "cancel" }
  | { kind: "take"; ticketId: number }
  | { kind: "reply"; ticketId: number }
  | { kind: "close"; ticketId: number }
  /**
   * Выдать тариф автору тикета.
   *
   * Пользователь в payload не назван — только тикет. Это не экономия места:
   * получатель берётся из строки тикета на сервере, поэтому подменить его,
   * переслав карточку и подставив чужой id, невозможно. Кнопка говорит «выдать
   * PLUS по обращению 42», а кому именно — знает база.
   */
  | { kind: "grant"; ticketId: number; plan: GrantablePlan; days: number };

/** Тарифы, которые выдаются кнопкой. FREE — это отзыв, у него своя кнопка. */
export type GrantablePlan = "plus" | "max";

export const callbackData = {
  category: (category: SupportCategoryId): string => `cat:${category}`,
  skipScreenshots: (): string => "flow:skip",
  submit: (): string => "flow:send",
  cancel: (): string => "flow:cancel",
  take: (ticketId: number): string => `tk:take:${ticketId}`,
  reply: (ticketId: number): string => `tk:reply:${ticketId}`,
  close: (ticketId: number): string => `tk:close:${ticketId}`,
  grant: (ticketId: number, plan: GrantablePlan, days: number): string =>
    `gr:${plan}:${days}:${ticketId}`,
} as const;

/** Anything unrecognised is null — the handler then answers the tap and stops. */
export function parseCallback(raw: string | undefined): SupportCallback | null {
  if (!raw) return null;

  const [prefix, ...rest] = raw.split(":");

  if (prefix === "cat") {
    const parsed = categorySchema.safeParse(rest[0]);
    return parsed.success ? { kind: "category", category: parsed.data } : null;
  }

  if (prefix === "flow") {
    if (rest[0] === "skip") return { kind: "skip-screenshots" };
    if (rest[0] === "send") return { kind: "submit" };
    if (rest[0] === "cancel") return { kind: "cancel" };
    return null;
  }

  if (prefix === "gr") {
    const [plan, rawDays, rawTicket] = rest;
    if (plan !== "plus" && plan !== "max") return null;

    const days = Number.parseInt(rawDays ?? "", 10);
    const ticketId = Number.parseInt(rawTicket ?? "", 10);

    // Потолок в 3650 дней — тот же, что у HTTP-эндпоинта: срок больше десяти
    // лет означает опечатку, а не щедрость.
    if (!Number.isSafeInteger(days) || days <= 0 || days > 3650) return null;
    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) return null;

    return { kind: "grant", ticketId, plan, days };
  }

  if (prefix === "tk") {
    const ticketId = Number.parseInt(rest[1] ?? "", 10);
    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) return null;

    if (rest[0] === "take") return { kind: "take", ticketId };
    if (rest[0] === "reply") return { kind: "reply", ticketId };
    if (rest[0] === "close") return { kind: "close", ticketId };
    return null;
  }

  return null;
}
