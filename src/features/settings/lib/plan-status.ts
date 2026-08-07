import type { PlanId } from "@/features/settings/types";

/**
 * What tier an account is *actually* on, as opposed to what its row last had
 * written to it.
 *
 * Pure and shared by both sides on purpose: the server resolves the stored row
 * through this before anything reads `plan` (see toSettingsItem in
 * server/settings.repository.ts), and the subscription screen renders the same
 * answer. One implementation means a lapsed PLUS can never be unlimited on the
 * server while the UI shows it as expired, or the reverse.
 *
 * Expiry is applied on read rather than by a scheduled job. There is nothing
 * to run at midnight, nothing to miss if the process was down, and an account
 * whose period ended degrades to FREE the instant it is next looked at — which
 * is the only moment the answer matters.
 */

/** FREE never expires; it is the floor every lapsed tier falls back to. */
export const FREE_PLAN: PlanId = "free";

export function isPaidPlan(plan: PlanId): boolean {
  return plan !== FREE_PLAN;
}

/**
 * The effective tier for a stored plan and its end date.
 *
 * A null `until` on a paid plan means "no end date" rather than "already
 * over" — that is what a comped or lifetime account looks like, and treating
 * a missing date as expired would silently strip access from exactly the
 * accounts granted it by hand.
 */
export function resolvePlan(
  stored: PlanId,
  until: Date | null,
  now: Date = new Date(),
): PlanId {
  if (!isPaidPlan(stored)) return FREE_PLAN;
  if (until === null) return stored;
  return until.getTime() > now.getTime() ? stored : FREE_PLAN;
}

/** Whole days left on a period, floored at 0. Null when there is no end date. */
export function daysLeft(until: string | null, now: Date = new Date()): number | null {
  if (until === null) return null;

  const end = new Date(until).getTime();
  if (Number.isNaN(end)) return null;

  const ms = end - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

const untilFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * "до 5 сентября 2026" — the line under an active paid tier.
 *
 * The trailing " г." ru-RU appends is dropped: this renders at 0.6875rem
 * beside a badge, and the abbreviation is three characters of noise in a place
 * where nothing else is abbreviated.
 */
export function formatPlanUntil(until: string): string {
  const date = new Date(until);
  if (Number.isNaN(date.getTime())) return "";
  return `до ${untilFormat.format(date).replace(/\s*г\.$/, "")}`;
}
