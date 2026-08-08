import "server-only";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { PlanId } from "@/features/settings/types";
import {
  limitFor,
  type FeatureLimit,
  type UsageFeature,
  type UsageWindow,
} from "@/features/usage/constants";
import { limitMessage } from "@/features/usage/lib/format";
import {
  nextMonthStart,
  nextWeekStart,
  periodMonthOf,
  weekKeyOf,
} from "@/features/usage/lib/period";
import type { ConsumeResult, FeatureUsage, UsageSnapshot } from "@/features/usage/types";
import * as repo from "@/features/usage/server/usage.repository";

/**
 * The one gate between a user and a Gemini call.
 *
 * Every AI surface in the app goes through a `consume*` here before the model
 * is reached, and gets its unit back through a `refund*` if the model produced
 * nothing usable. Nothing else is allowed to read a counter or a ceiling: the
 * limits live in constants.ts, the atomic writes in usage.repository.ts, and
 * the decision of what a tier may do lives here.
 *
 * The gate is deliberately in the *server actions*, not inside src/ai/. Those
 * modules are a thin wrapper over the model — given a prompt they call Gemini —
 * and pushing the account, the tier and the calendar into them would make the
 * lowest layer of the app depend on the highest. The action already holds all
 * three, so the check costs it nothing.
 */

export interface UsageContext {
  userId: string;
  /** Already resolved for expiry — a lapsed PLUS must arrive here as "free". */
  plan: PlanId;
  /** The user's own calendar day, from Profile.timezone. */
  today: CalendarDay;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

interface WindowCandidate {
  window: UsageWindow;
  used: number;
  limit: number;
  renewsOn: CalendarDay | null;
}

/**
 * Which ceiling actually binds, and how much of it is left.
 *
 * A feature can be limited on three axes at once (FREE food is one a week and
 * five a month; FREE appearance is one a month and one ever), and only one of
 * them can be printed on a card or in an error. The binding window is the one
 * with the least room — anything else would show a counter that says "4
 * осталось" beside a server that refuses the next call.
 *
 * Ties resolve toward the *longer* window, which is why the candidates are
 * built lifetime-first. A FREE user who spent their single appearance analysis
 * has zero left on both axes; calling that the monthly one would promise it
 * back on the 1st, and that promise would be false.
 */
function resolveFeatureUsage(
  feature: UsageFeature,
  limit: FeatureLimit,
  counts: { month: number; week: number; lifetime: number },
  today: CalendarDay,
): FeatureUsage {
  const candidates: WindowCandidate[] = [];

  if (limit.lifetime !== null) {
    candidates.push({
      window: "lifetime",
      used: counts.lifetime,
      limit: limit.lifetime,
      renewsOn: null,
    });
  }
  if (limit.perWeek !== null) {
    candidates.push({
      window: "week",
      used: counts.week,
      limit: limit.perWeek,
      renewsOn: nextWeekStart(today),
    });
  }
  if (limit.perMonth !== null) {
    candidates.push({
      window: "month",
      used: counts.month,
      limit: limit.perMonth,
      renewsOn: nextMonthStart(today),
    });
  }

  if (candidates.length === 0) {
    return {
      feature,
      used: counts.month,
      limit: null,
      window: "month",
      allowed: true,
      renewsOn: null,
    };
  }

  const remaining = (candidate: WindowCandidate) => candidate.limit - candidate.used;
  const binding = candidates.reduce((tightest, candidate) =>
    remaining(candidate) < remaining(tightest) ? candidate : tightest,
  );

  return {
    feature,
    used: binding.used,
    limit: binding.limit,
    window: binding.window,
    allowed: remaining(binding) > 0,
    renewsOn: binding.renewsOn,
  };
}

/**
 * All three counters for one user, in one round trip.
 *
 * The three reads are issued together rather than per feature because this is
 * what the settings screen renders in full, and the appearance lifetime sum is
 * the only one that touches more than the current month.
 */
export async function getUserUsage(ctx: UsageContext): Promise<UsageSnapshot> {
  const periodMonth = periodMonthOf(ctx.today);
  const weekKey = weekKeyOf(ctx.today);

  const [counts, weekUsed, lifetimeAppearance] = await Promise.all([
    repo.readUsageCounts(ctx.userId, periodMonth),
    repo.readFoodWeekUsed(ctx.userId, weekKey),
    repo.readAppearanceLifetimeUsed(ctx.userId),
  ]);

  return {
    plan: ctx.plan,
    periodMonth,
    coach: resolveFeatureUsage(
      "coach",
      limitFor(ctx.plan, "coach"),
      { month: counts.coachMessagesUsed, week: 0, lifetime: 0 },
      ctx.today,
    ),
    food: resolveFeatureUsage(
      "food",
      limitFor(ctx.plan, "food"),
      { month: counts.foodAnalysesUsed, week: weekUsed, lifetime: 0 },
      ctx.today,
    ),
    appearance: resolveFeatureUsage(
      "appearance",
      limitFor(ctx.plan, "appearance"),
      {
        month: counts.appearanceAnalysesUsed,
        week: 0,
        lifetime: lifetimeAppearance,
      },
      ctx.today,
    ),
  };
}

/**
 * Where one feature stands, without spending anything.
 *
 * For screens and for pre-flight checks — never as the permission to call the
 * model. Permission is `consume*`, which is the same question asked
 * atomically; a check followed by a call is exactly the race this architecture
 * exists to close.
 */
export async function checkCoachLimit(ctx: UsageContext): Promise<FeatureUsage> {
  return (await getUserUsage(ctx)).coach;
}

export async function checkFoodAnalysisLimit(ctx: UsageContext): Promise<FeatureUsage> {
  return (await getUserUsage(ctx)).food;
}

export async function checkAppearanceLimit(ctx: UsageContext): Promise<FeatureUsage> {
  return (await getUserUsage(ctx)).appearance;
}

// ---------------------------------------------------------------------------
// Spending
// ---------------------------------------------------------------------------

/**
 * The refusal, written from the state that caused it.
 *
 * Read after the reserve failed rather than guessed from it: the numbers in the
 * message are then the ones the user would see on the settings screen a second
 * later, including in the case where the reserve failed on a window this
 * request was not even aware of.
 */
async function deny(
  ctx: UsageContext,
  feature: UsageFeature,
  status: FeatureUsage,
): Promise<ConsumeResult> {
  return {
    success: false,
    reason: "LIMIT_REACHED",
    message: limitMessage({
      feature,
      plan: ctx.plan,
      window: status.window,
      limit: status.limit ?? 0,
      renewsOn: status.renewsOn,
      today: ctx.today,
    }),
    feature,
    used: status.used,
    limit: status.limit ?? 0,
    window: status.window,
    renewsOn: status.renewsOn,
  };
}

/** One Coach turn — a chat message, a daily brief, or a report summary. */
export async function consumeCoachMessage(ctx: UsageContext): Promise<ConsumeResult> {
  const periodMonth = periodMonthOf(ctx.today);
  const limit = limitFor(ctx.plan, "coach");

  const reserved = await repo.reserveCoachMessage(ctx.userId, periodMonth, limit.perMonth);
  if (reserved) return { success: true };

  return deny(ctx, "coach", await checkCoachLimit(ctx));
}

/** One food photo read by Vision. */
export async function consumeFoodAnalysis(ctx: UsageContext): Promise<ConsumeResult> {
  const periodMonth = periodMonthOf(ctx.today);
  const weekKey = weekKeyOf(ctx.today);
  const limit = limitFor(ctx.plan, "food");

  const reserved = await repo.reserveFoodAnalysis(
    ctx.userId,
    periodMonth,
    weekKey,
    limit.perMonth,
    limit.perWeek,
  );
  if (reserved) return { success: true };

  return deny(ctx, "food", await checkFoodAnalysisLimit(ctx));
}

/**
 * One appearance photo read by Vision.
 *
 * Two steps, because a lifetime allowance cannot be expressed as a WHERE clause
 * on a single month's row. The monthly ceiling is reserved atomically first,
 * which is what serialises concurrent callers; only then is the lifetime sum
 * read, with the reservation already included in it. A caller who is over the
 * lifetime allowance has their unit handed straight back, so a refused request
 * leaves the counters exactly as it found them.
 */
export async function consumeAppearanceAnalysis(ctx: UsageContext): Promise<ConsumeResult> {
  const periodMonth = periodMonthOf(ctx.today);
  const limit = limitFor(ctx.plan, "appearance");

  const reserved = await repo.reserveAppearanceAnalysis(
    ctx.userId,
    periodMonth,
    limit.perMonth,
  );
  if (!reserved) {
    return deny(ctx, "appearance", await checkAppearanceLimit(ctx));
  }

  if (limit.lifetime !== null) {
    const lifetimeUsed = await repo.readAppearanceLifetimeUsed(ctx.userId);
    if (lifetimeUsed > limit.lifetime) {
      await repo.refundAppearanceAnalysis(ctx.userId, periodMonth);
      return deny(ctx, "appearance", await checkAppearanceLimit(ctx));
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Giving it back
// ---------------------------------------------------------------------------

/**
 * The unit returns when the call it paid for produced nothing the user can
 * use — no API key configured, a timeout, a response that failed validation.
 *
 * Not called when the model answered and the user simply disliked the answer:
 * that call was made, and it cost what it cost.
 */
export async function refundCoachMessage(ctx: UsageContext): Promise<void> {
  await repo.refundCoachMessage(ctx.userId, periodMonthOf(ctx.today));
}

export async function refundFoodAnalysis(ctx: UsageContext): Promise<void> {
  await repo.refundFoodAnalysis(
    ctx.userId,
    periodMonthOf(ctx.today),
    weekKeyOf(ctx.today),
  );
}

export async function refundAppearanceAnalysis(ctx: UsageContext): Promise<void> {
  await repo.refundAppearanceAnalysis(ctx.userId, periodMonthOf(ctx.today));
}

/** Support's reset. See the note on the repository function. */
export async function resetMonthlyUsage(
  userId: string,
  periodMonth: string,
): Promise<void> {
  await repo.resetMonthlyUsage(userId, periodMonth);
}
