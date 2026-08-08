import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { limitFor, type UsageFeature, type UsageWindow } from "@/features/usage/constants";
import type { PlanId } from "@/features/settings/types";

/**
 * Every sentence the app says about a limit, in one file.
 *
 * The limits themselves are numbers in constants.ts; this turns them into
 * Russian. Both the marketing copy ("60 анализов еды в месяц" on the pricing
 * table) and the refusal ("лимит исчерпан, обновится 1 сентября") are generated
 * from the same source, which is what makes it impossible for the landing to
 * promise a figure the server does not enforce — the failure mode the previous
 * hardcoded "10 запросов к AI Coach в месяц" on the landing actually had while
 * the server enforced 20 a day.
 */

/** The three Russian plural forms: 1 анализ, 2 анализа, 5 анализов. */
function plural(count: number, forms: [string, string, string]): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

const UNIT_FORMS: Record<UsageFeature, [string, string, string]> = {
  coach: ["сообщение", "сообщения", "сообщений"],
  food: ["анализ", "анализа", "анализов"],
  appearance: ["анализ", "анализа", "анализов"],
};

/** "20 сообщений", "1 анализ" — a count with its unit. */
export function formatUnits(feature: UsageFeature, count: number): string {
  return `${count} ${plural(count, UNIT_FORMS[feature])}`;
}

/** The plain name of a window, as it appears mid-sentence. */
const WINDOW_SUFFIX: Record<UsageWindow, string> = {
  month: "в месяц",
  week: "в неделю",
  lifetime: "всего",
};

/**
 * One tier's allowance for one feature, as a feature-list line.
 *
 * Reads the narrowest window that is actually set, because that is the promise
 * the user will meet first: FREE food is "1 анализ в неделю", not "5 в месяц".
 */
export function formatAllowance(plan: PlanId, feature: UsageFeature): string {
  const limit = limitFor(plan, feature);

  if (limit.lifetime !== null) {
    return limit.lifetime === 1
      ? "1 бесплатный анализ"
      : `${formatUnits(feature, limit.lifetime)} всего`;
  }
  if (limit.perWeek !== null) {
    return `${formatUnits(feature, limit.perWeek)} в неделю`;
  }
  if (limit.perMonth !== null) {
    return `${formatUnits(feature, limit.perMonth)} в месяц`;
  }
  return "без ограничений";
}

/** The tier a limit message points at, or null at the top of the ladder. */
export function nextPlanUp(plan: PlanId): PlanId | null {
  if (plan === "free") return "plus";
  if (plan === "plus") return "max";
  return null;
}

const PLAN_NAME: Record<PlanId, string> = {
  free: "NOVA FREE",
  plus: "NOVA PLUS",
  max: "NOVA MAX",
};

export interface LimitMessageInput {
  feature: UsageFeature;
  plan: PlanId;
  window: UsageWindow;
  limit: number;
  /** When the window refills. Null for a lifetime allowance. */
  renewsOn: CalendarDay | null;
  /** The user's today, so "1 сентября" only grows a year when it needs one. */
  today: CalendarDay;
}

const FEATURE_SUBJECT: Record<UsageFeature, string> = {
  coach: "Лимит сообщений AI Coach",
  food: "Лимит анализа еды",
  appearance: "Лимит анализа внешности",
};

/**
 * Why the request was refused, what happens next, and what lifts it.
 *
 * Three sentences in that order, always. The middle one is what makes a limit
 * different from a dead end — the previous design's message said only
 * "бесплатные запросы закончились", which reads as permanent even when the
 * budget renews the following morning. A window that genuinely never refills
 * (FREE's single appearance analysis) says so instead of inventing a date.
 */
export function limitMessage(input: LimitMessageInput): string {
  const { feature, plan, window, limit, renewsOn, today } = input;

  const spent =
    window === "lifetime"
      ? `${FEATURE_SUBJECT[feature]}: бесплатный анализ уже использован.`
      : `${FEATURE_SUBJECT[feature]} исчерпан — ${formatUnits(feature, limit)} ${WINDOW_SUFFIX[window]}.`;

  const renewal = renewsOn ? ` Обновится ${formatDay(renewsOn, today)}.` : "";

  const upgrade = nextPlanUp(plan);
  const offer = upgrade
    ? ` ${PLAN_NAME[upgrade]} — ${formatAllowance(upgrade, feature)}.`
    : "";

  return `${spent}${renewal}${offer}`;
}
