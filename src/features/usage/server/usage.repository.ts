import "server-only";
import { db } from "@/server/db";
import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * The counters, and the only writes that are allowed to move them.
 *
 * Everything here exists to make one guarantee: a user cannot spend more than
 * their tier allows, no matter how many requests they open at once. That rules
 * out the obvious implementation — read the counter, compare it to the limit,
 * write it back — because two requests that read "19 of 20" a millisecond apart
 * both pass, and both spend a Gemini call. It is not a theoretical race: a
 * double-tapped button produces it, and a script produces it deliberately.
 *
 * So every spend is a single conditional UPDATE that carries the ceiling in its
 * own WHERE clause:
 *
 *     UPDATE UserUsage SET coachMessagesUsed = coachMessagesUsed + 1
 *      WHERE userId = ? AND periodMonth = ? AND coachMessagesUsed < 20
 *
 * The database evaluates the comparison and the increment as one statement, so
 * the twenty-first caller matches zero rows and is refused — with no
 * transaction, no lock held across the network, and identical behaviour on
 * SQLite today and PostgreSQL later. `count` coming back as 1 *is* the
 * permission; there is no second step that could be skipped.
 *
 * The counter is therefore spent *before* the model is called, not after. That
 * inverts the previous design, which recorded usage on success and so charged
 * nothing for a call that had already cost money by failing late. The honest
 * half of that idea is kept as an explicit refund (see `refundUsage`): the call
 * site gives the unit back when the model produced nothing usable, which is a
 * decision at the call site rather than a hole in the ceiling.
 */

export interface UsageCounts {
  foodAnalysesUsed: number;
  appearanceAnalysesUsed: number;
  coachMessagesUsed: number;
  foodWeekKey: string | null;
  foodWeekUsed: number;
}

const EMPTY: UsageCounts = {
  foodAnalysesUsed: 0,
  appearanceAnalysesUsed: 0,
  coachMessagesUsed: 0,
  foodWeekKey: null,
  foodWeekUsed: 0,
};

const COUNTER_SELECT = {
  foodAnalysesUsed: true,
  appearanceAnalysesUsed: true,
  coachMessagesUsed: true,
  foodWeekKey: true,
  foodWeekUsed: true,
} as const;

/**
 * This month's counters. A month that was never used has no row, and absence
 * reads as zero rather than being created on the spot — a user who opens the
 * settings screen has not spent anything, and a read must not write.
 */
export async function readUsageCounts(
  userId: string,
  periodMonth: string,
): Promise<UsageCounts> {
  const row = await db.userUsage.findUnique({
    where: { userId_periodMonth: { userId, periodMonth } },
    select: COUNTER_SELECT,
  });
  return row ?? EMPTY;
}

/**
 * Food analyses spent in one week, across every month row that week touches.
 *
 * Summed by week key rather than read from the current month's row, because a
 * week that straddles the 1st is filed under two rows — and a FREE user whose
 * one weekly analysis fell on the 31st would otherwise get a second one on the
 * 1st, which is precisely the boundary a script would sit on.
 */
export async function readFoodWeekUsed(userId: string, weekKey: CalendarDay): Promise<number> {
  const rows = await db.userUsage.findMany({
    where: { userId, foodWeekKey: weekKey },
    select: { foodWeekUsed: true },
  });
  return rows.reduce((total, row) => total + row.foodWeekUsed, 0);
}

/** The same sum, minus the row this month's spend would land on. */
async function readFoodWeekUsedElsewhere(
  userId: string,
  weekKey: CalendarDay,
  periodMonth: string,
): Promise<number> {
  const rows = await db.userUsage.findMany({
    where: { userId, foodWeekKey: weekKey, NOT: { periodMonth } },
    select: { foodWeekUsed: true },
  });
  return rows.reduce((total, row) => total + row.foodWeekUsed, 0);
}

/**
 * Appearance analyses this account has ever had.
 *
 * A sum over the month rows rather than a stored lifetime column: one row per
 * month means a handful of rows per account, and a second column holding a
 * total of the first would be a cached aggregate that drifts the moment a month
 * is reset by support — the same reason no table in this app stores a
 * percentage it could add up.
 */
export async function readAppearanceLifetimeUsed(userId: string): Promise<number> {
  const result = await db.userUsage.aggregate({
    where: { userId },
    _sum: { appearanceAnalysesUsed: true },
  });
  return result._sum.appearanceAnalysesUsed ?? 0;
}

/**
 * The row a conditional UPDATE needs to exist before it can match.
 *
 * Two callers racing on a brand-new month both try to create it and one loses
 * on the unique constraint; that loser's error is swallowed, because the only
 * thing it was trying to achieve — a row being there — is exactly what the
 * winner just did. `update: {}` makes the winning branch a no-op rather than a
 * write, so this never touches counters.
 */
async function ensureUsageRow(userId: string, periodMonth: string): Promise<void> {
  try {
    await db.userUsage.upsert({
      where: { userId_periodMonth: { userId, periodMonth } },
      create: { userId, periodMonth },
      update: {},
    });
  } catch {
    // Lost the create race. The row exists either way, which is all this was for.
  }
}

/** A ceiling filter, or nothing at all when the tier has no ceiling. */
function below(limit: number | null): { lt: number } | undefined {
  return limit === null ? undefined : { lt: limit };
}

/**
 * Spend one Coach message. True means it was charged and may proceed.
 *
 * Unlimited tiers still increment — the counter is what the settings screen and
 * the cost forecast read, and a tier with no ceiling is a tier whose usage we
 * most need to be able to see.
 */
export async function reserveCoachMessage(
  userId: string,
  periodMonth: string,
  monthLimit: number | null,
): Promise<boolean> {
  await ensureUsageRow(userId, periodMonth);

  const { count } = await db.userUsage.updateMany({
    where: { userId, periodMonth, coachMessagesUsed: below(monthLimit) },
    data: { coachMessagesUsed: { increment: 1 } },
  });
  return count > 0;
}

/**
 * Spend one appearance analysis against the monthly ceiling.
 *
 * The lifetime allowance is *not* checked here, and that is safe rather than
 * sloppy: FREE's monthly ceiling for this feature is 1, so at most one
 * concurrent request per month can ever get past this statement, and the
 * service checks the lifetime sum afterwards with no race left to lose.
 */
export async function reserveAppearanceAnalysis(
  userId: string,
  periodMonth: string,
  monthLimit: number | null,
): Promise<boolean> {
  await ensureUsageRow(userId, periodMonth);

  const { count } = await db.userUsage.updateMany({
    where: { userId, periodMonth, appearanceAnalysesUsed: below(monthLimit) },
    data: { appearanceAnalysesUsed: { increment: 1 } },
  });
  return count > 0;
}

/**
 * Spend one food analysis against both the monthly and the weekly ceiling.
 *
 * Three statements, and the order matters:
 *
 *   1. Roll the week window forward if the stored key is not this week. A stale
 *      key means last week's count, and zeroing it on read is what makes the
 *      weekly allowance renew with nothing scheduled — the same convention
 *      every day-scoped table in the schema uses. The OR is deliberate: a row
 *      whose key is NULL has never had a food analysis, and `not: key` alone
 *      would not match it in SQL.
 *   2. Subtract what the same week already spent on *another* month's row, so
 *      the ceiling this statement enforces is the whole week's, not this row's.
 *   3. One conditional UPDATE carrying both ceilings. Both counters move
 *      together or neither does.
 */
export async function reserveFoodAnalysis(
  userId: string,
  periodMonth: string,
  weekKey: CalendarDay,
  monthLimit: number | null,
  weekLimit: number | null,
): Promise<boolean> {
  await ensureUsageRow(userId, periodMonth);

  await db.userUsage.updateMany({
    where: {
      userId,
      periodMonth,
      OR: [{ foodWeekKey: null }, { foodWeekKey: { not: weekKey } }],
    },
    data: { foodWeekKey: weekKey, foodWeekUsed: 0 },
  });

  let effectiveWeekLimit = weekLimit;
  if (weekLimit !== null) {
    const spentElsewhere = await readFoodWeekUsedElsewhere(userId, weekKey, periodMonth);
    effectiveWeekLimit = weekLimit - spentElsewhere;
    if (effectiveWeekLimit <= 0) return false;
  }

  const { count } = await db.userUsage.updateMany({
    where: {
      userId,
      periodMonth,
      foodWeekKey: weekKey,
      foodAnalysesUsed: below(monthLimit),
      foodWeekUsed: below(effectiveWeekLimit),
    },
    data: {
      foodAnalysesUsed: { increment: 1 },
      foodWeekUsed: { increment: 1 },
    },
  });
  return count > 0;
}

/**
 * Give a reserved unit back, when the call it paid for produced nothing.
 *
 * Guarded by `gt: 0` so a double refund — a retry, a caller that both refunds
 * and throws — can never drive a counter negative and hand out free budget.
 * The food branch only rewinds the weekly counter while the stored key is still
 * this week: a refund arriving after midnight on Sunday must not decrement a
 * window it was never charged to.
 */
export async function refundCoachMessage(userId: string, periodMonth: string): Promise<void> {
  await db.userUsage.updateMany({
    where: { userId, periodMonth, coachMessagesUsed: { gt: 0 } },
    data: { coachMessagesUsed: { decrement: 1 } },
  });
}

export async function refundAppearanceAnalysis(
  userId: string,
  periodMonth: string,
): Promise<void> {
  await db.userUsage.updateMany({
    where: { userId, periodMonth, appearanceAnalysesUsed: { gt: 0 } },
    data: { appearanceAnalysesUsed: { decrement: 1 } },
  });
}

export async function refundFoodAnalysis(
  userId: string,
  periodMonth: string,
  weekKey: CalendarDay,
): Promise<void> {
  await db.userUsage.updateMany({
    where: { userId, periodMonth, foodAnalysesUsed: { gt: 0 } },
    data: { foodAnalysesUsed: { decrement: 1 } },
  });
  await db.userUsage.updateMany({
    where: { userId, periodMonth, foodWeekKey: weekKey, foodWeekUsed: { gt: 0 } },
    data: { foodWeekUsed: { decrement: 1 } },
  });
}

/**
 * Zero one month's counters for one account.
 *
 * Support's tool, not the app's: a user who was charged for a failed batch, or
 * a tester who needs a clean period. Deliberately scoped to a single month and
 * a single user — there is no "reset everyone" here, because the monthly window
 * already resets itself and a bulk reset would only ever be a way to give away
 * budget by accident.
 *
 * Nothing in the product calls this on its own. Finishing onboarding used to
 * clear the AI counter, which made "пройти онбординг заново" a way to refill a
 * spent allowance from inside the app — that is now gone rather than moved.
 */
export async function resetMonthlyUsage(userId: string, periodMonth: string): Promise<void> {
  await db.userUsage.updateMany({
    where: { userId, periodMonth },
    data: {
      foodAnalysesUsed: 0,
      appearanceAnalysesUsed: 0,
      coachMessagesUsed: 0,
      foodWeekKey: null,
      foodWeekUsed: 0,
    },
  });
}
