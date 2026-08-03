import "server-only";
import { db } from "@/server/db";
import { dayToDate, type CalendarDay } from "@/shared/lib/calendar-day";
import type { PlanId } from "@/features/settings/types";
import type { AiFeature } from "@/ai/types";

/**
 * One shared budget across every AI surface — Coach, food-photo analysis,
 * appearance-photo analysis alike — not three separate ceilings. Centralized
 * here so a future fourth AI feature (or a pricing change) is a read of this
 * one file rather than a hunt through four server actions for a hardcoded
 * number.
 *
 * The budget is *per day*, measured in the user's own calendar days, and it is
 * why this module takes a CalendarDay everywhere. The previous design was a
 * lifetime ceiling of five calls, and it had two consequences that read as
 * bugs rather than as a pricing decision:
 *
 *   1. Five conversations with the Coach exhausted the account permanently.
 *      There was no day, no month and no event that ever gave a unit back, so
 *      "бесплатные запросы закончились" was a state an account entered once
 *      and never left.
 *   2. Because restarting onboarding deliberately keeps everything except the
 *      completion stamp, a user who went back through the flow arrived on a
 *      brand-new-looking app that immediately said the limit was spent. That
 *      is the "сразу после онбординга" report, and it was not a counter bug:
 *      the counter was right, the ceiling was wrong.
 *
 * A day is also the unit the product can honestly explain on the pricing
 * screen ("20 запросов в день"), and it is what makes the Coach's once-a-day
 * proactive briefing affordable without eating the conversation's budget.
 */
export const AI_DAILY_LIMITS: Record<PlanId, number | null> = {
  free: 20,
  plus: null,
  max: null,
};

export interface AiUsageStatus {
  /** null means unlimited. */
  limit: number | null;
  /** Calls already made *today*. */
  used: number;
  allowed: boolean;
}

/**
 * Whether this user has budget left today, without spending any of it.
 *
 * Callers check this *before* paying for a Gemini call — an analysis that will
 * be refused should never reach the model. Recording the spend is a separate
 * step (see recordAiUsage) so a failed or timed-out call never silently
 * consumes a unit the user got nothing for.
 *
 * The reset is a read, not a scheduled job: a stored day that is not today
 * means today's count is zero, so a budget renews the instant the user's own
 * calendar day rolls over, with nothing to run at midnight in any timezone.
 */
export async function getAiUsageStatus(
  userId: string,
  plan: PlanId,
  today: CalendarDay,
): Promise<AiUsageStatus> {
  const limit = AI_DAILY_LIMITS[plan];
  const row = await db.userSettings.findUnique({
    where: { userId },
    select: { aiUsageToday: true, aiUsageDay: true },
  });

  const used = isSameDay(row?.aiUsageDay ?? null, today) ? (row?.aiUsageToday ?? 0) : 0;

  return { limit, used, allowed: limit === null || used < limit };
}

/**
 * One AI call that actually produced a usable result, charged to the shared
 * counter.
 *
 * The common path is a single conditional UPDATE — `where` matches only when
 * the stored day is already today, so two concurrent calls from the same user
 * both increment rather than racing on a value read a moment earlier. The
 * upsert underneath it covers the two cases that update cannot: the day just
 * rolled over (count restarts at one) and the settings row does not exist yet.
 *
 * Unlimited plans still record usage — for the settings screen and for future
 * analytics; they are simply never compared against a ceiling.
 *
 * `feature` is accepted for the call site to be self-documenting and for
 * future per-feature logging — the counter itself does not split by it,
 * because the product's limit is one shared budget, not three.
 */
export async function recordAiUsage(
  userId: string,
  feature: AiFeature,
  today: CalendarDay,
): Promise<void> {
  const day = dayToDate(today);

  const { count } = await db.userSettings.updateMany({
    where: { userId, aiUsageDay: day },
    data: { aiUsageCount: { increment: 1 }, aiUsageToday: { increment: 1 } },
  });

  if (count === 0) {
    await db.userSettings.upsert({
      where: { userId },
      create: { userId, aiUsageCount: 1, aiUsageToday: 1, aiUsageDay: day },
      update: { aiUsageCount: { increment: 1 }, aiUsageToday: 1, aiUsageDay: day },
    });
  }

  console.info(`[ai] usage recorded: user=${userId} feature=${feature} day=${today}`);
}

/**
 * Give the account today's budget back.
 *
 * Called when onboarding completes: finishing the flow is the one moment the
 * app promises a fresh start, and arriving on the first screen of a
 * just-configured account to be told the AI is spent is the single worst first
 * impression the Coach can make. The lifetime total is deliberately left
 * alone — it is what the analytics count, and resetting it would erase the
 * fact that the calls happened.
 */
export async function resetDailyAiUsage(userId: string): Promise<void> {
  await db.userSettings.updateMany({
    where: { userId },
    data: { aiUsageToday: 0, aiUsageDay: null },
  });
}

/**
 * Thrown by an AI feature action when the caller has no budget left and the
 * feature has no non-AI fallback to fall back to (unlike Coach, which
 * degrades to its deterministic composer instead of throwing — see
 * ai/coach.ts). The settings/subscription screens are what this points the
 * user toward.
 */
export class AiLimitExceededError extends Error {
  readonly used: number;
  readonly limit: number;

  constructor(used: number, limit: number) {
    super(`AI usage limit reached: ${used}/${limit}`);
    this.name = "AiLimitExceededError";
    this.used = used;
    this.limit = limit;
  }
}

/**
 * Check-and-throw in one call, for the two analysis actions that have no
 * fallback path. Coach calls getAiUsageStatus directly instead, because
 * "not allowed" means "skip the model and use the draft", not an error.
 */
export async function requireAiBudget(
  userId: string,
  plan: PlanId,
  today: CalendarDay,
): Promise<void> {
  const status = await getAiUsageStatus(userId, plan, today);
  if (!status.allowed) {
    throw new AiLimitExceededError(status.used, status.limit ?? 0);
  }
}

/** A stored UTC-midnight day column against a CalendarDay. */
function isSameDay(stored: Date | null, today: CalendarDay): boolean {
  return stored !== null && stored.getTime() === dayToDate(today).getTime();
}
