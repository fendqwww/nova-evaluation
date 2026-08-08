import type { PlanId } from "@/features/settings/types";

/**
 * What each tier is allowed to spend on AI, per feature.
 *
 * This file is the ceiling *and* the copy. Every number a user reads — on the
 * subscription screen, on the landing's pricing table, in the "лимит исчерпан"
 * message — is formatted from here (see lib/format.ts), and every number the
 * server enforces is read from here (see server/usage.service.ts). They cannot
 * disagree, which is the whole reason the previous design's one hardcoded "20"
 * lived in two files that had to be edited together.
 *
 * Three windows rather than one, because the three limits the product actually
 * sells are not the same kind of promise:
 *
 *   - `perMonth` is the billing period. It is what the paid tiers are, and it
 *     renews with the subscription rather than on some unrelated boundary.
 *   - `perWeek` is what makes FREE's food scanner a taste rather than a habit
 *     we pay for daily. A monthly figure cannot express it: "4 в месяц" is
 *     spent in four minutes on the first evening, and then the feature is dead
 *     for 29 days, which reads as broken rather than as free.
 *   - `lifetime` is a promise about the account, not about a period — FREE's
 *     one appearance analysis is "попробуй один раз", and a monthly reset would
 *     turn it into twelve free Vision calls a year per account.
 *
 * null means unlimited on that axis. A feature is allowed only when *every*
 * non-null window still has room, so the windows narrow each other rather than
 * competing: FREE food is 1 per week and never more than 5 in a month.
 *
 * Adding a fourth AI feature is a new key in UsageFeature plus a column on
 * UserUsage — nothing else in the app has to learn about it, because every
 * caller goes through the service.
 */

export const USAGE_FEATURES = ["coach", "food", "appearance"] as const;
export type UsageFeature = (typeof USAGE_FEATURES)[number];

/** Which window a limit was hit in — what the message has to explain. */
export type UsageWindow = "month" | "week" | "lifetime";

export interface FeatureLimit {
  /** Calls allowed in the user's local calendar month. null = unlimited. */
  perMonth: number | null;
  /** Calls allowed in the user's local week (Monday-first). null = unlimited. */
  perWeek: number | null;
  /** Calls allowed for the lifetime of the account. null = unlimited. */
  lifetime: number | null;
}

const UNLIMITED: FeatureLimit = { perMonth: null, perWeek: null, lifetime: null };

/**
 * FREE.
 *
 * Deliberately not zero on any feature: an account that cannot try the thing
 * being sold has no reason to upgrade, and a "0 / 0" counter is indistinguishable
 * from a broken feature. It is instead the smallest allowance that still shows
 * what NOVA does — one plate, one photo of yourself, and enough Coach turns to
 * have a real conversation, because text is the cheap one.
 */
const FREE_LIMITS: Record<UsageFeature, FeatureLimit> = {
  // Text, and by far the cheapest of the three — 20 turns is a month of asking
  // a question every other day.
  coach: { perMonth: 20, perWeek: null, lifetime: null },
  // One plate a week. The monthly cap is what a strict week-by-week reading
  // already implies (a month spans at most five Mondays); it is spelled out so
  // the ceiling does not depend on how the calendar falls.
  food: { perMonth: 5, perWeek: 1, lifetime: null },
  // One, ever. The most expensive call in the app: a full-resolution portrait
  // against a long structured schema.
  appearance: { perMonth: 1, perWeek: null, lifetime: 1 },
};

/**
 * PLUS — the paid tier the pricing screen sells (`plan = "plus"`, shown as
 * NOVA PLUS). Generous enough that a daily user never sees a limit: 60 food
 * analyses is two a day, 30 appearance readings is one a day, 300 Coach
 * messages is ten a day.
 */
const PLUS_LIMITS: Record<UsageFeature, FeatureLimit> = {
  coach: { perMonth: 300, perWeek: null, lifetime: null },
  food: { perMonth: 60, perWeek: null, lifetime: null },
  appearance: { perMonth: 30, perWeek: null, lifetime: null },
};

/**
 * MAX. Still a number rather than `null` on every axis, and that is a
 * deliberate product decision: an unlimited tier is a tier whose cost cannot be
 * forecast, and one automated client can spend a year of margin overnight. The
 * ceilings here are far above what a human reaches (five food photos and three
 * portraits a day, every day) so they read as "без ограничений" in practice
 * while still being a ceiling on the invoice.
 */
const MAX_LIMITS: Record<UsageFeature, FeatureLimit> = {
  coach: { perMonth: 1000, perWeek: null, lifetime: null },
  food: { perMonth: 150, perWeek: null, lifetime: null },
  appearance: { perMonth: 100, perWeek: null, lifetime: null },
};

export const PLAN_LIMITS: Record<PlanId, Record<UsageFeature, FeatureLimit>> = {
  free: FREE_LIMITS,
  plus: PLUS_LIMITS,
  max: MAX_LIMITS,
};

/** The ceilings for one feature on one tier. */
export function limitFor(plan: PlanId, feature: UsageFeature): FeatureLimit {
  return PLAN_LIMITS[plan]?.[feature] ?? UNLIMITED;
}

/**
 * How each feature is named where usage is shown.
 *
 * Here rather than in the component because the same three labels appear on the
 * settings card, in the plan feature lists and in the limit messages — three
 * places that were describing the same counter in three different words before
 * there was one file to name it in.
 */
export const USAGE_LABELS: Record<UsageFeature, { title: string; hint: string }> = {
  coach: { title: "AI Coach", hint: "Сообщения коучу и разборы дня" },
  appearance: { title: "AI Vision", hint: "Анализ внешности по фото" },
  food: { title: "Food Scanner", hint: "Распознавание еды по фото" },
};

/** The order the three counters are shown in: cheapest and most-used first. */
export const USAGE_DISPLAY_ORDER: readonly UsageFeature[] = ["coach", "food", "appearance"];
