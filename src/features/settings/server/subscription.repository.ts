import "server-only";
import { db } from "@/server/db";
import type { PlanId } from "@/features/settings/types";
import { FREE_PLAN, isPaidPlan } from "@/features/settings/lib/plan-status";

/**
 * Granting and revoking paid tiers — the seam payments will plug into.
 *
 * There is no payment provider yet: PLUS is sold by talking to us, and turned
 * on by hand through the admin endpoint (see app/api/admin/activate-plan). The
 * point of this module is that "by hand" is the *caller*, not the mechanism.
 * Activation is already one function with the shape a webhook needs
 * (who, which tier, how long, and where it came from), so wiring ЮKassa,
 * Stripe or Telegram Payments later is a new caller of activatePlan — not a
 * change to how tiers are stored, resolved or enforced.
 *
 * Deliberately *not* a Subscription table. A tier is one fact about an account
 * ("what can this user do right now"), and it is answered by three columns on
 * the row that already exists. A provider that needs an invoice history can
 * add its own table next to this one; nothing here has to move for that,
 * because nothing outside this file writes the plan columns.
 */

/** Where a grant came from. Logged, and the field a provider will extend. */
export type PlanSource = "manual" | "restore";

export interface PlanGrant {
  plan: PlanId;
  /** ISO instant the current period ends, or null for no end date. */
  until: string | null;
}

/**
 * Put an account on a paid tier for `days`, starting now.
 *
 * Extends rather than replaces: activating PLUS on an account with 12 days
 * left leaves it with 12 + days, because the alternative silently destroys
 * time somebody paid for. A lapsed or free account starts from now instead —
 * an expired period is not credit.
 *
 * `days` of null grants the tier with no end date, which is what a comped
 * account looks like.
 */
export async function activatePlan(
  userId: string,
  plan: PlanId,
  days: number | null,
  source: PlanSource = "manual",
): Promise<PlanGrant> {
  const now = new Date();
  const current = await db.userSettings.findUnique({
    where: { userId },
    select: { plan: true, planSince: true, planUntil: true },
  });

  // Only time left on the *same* tier carries over. Upgrading PLUS -> MAX
  // starts a fresh period rather than inheriting the cheaper tier's days.
  const carryOver =
    current?.plan === plan && current.planUntil !== null && current.planUntil > now
      ? current.planUntil
      : now;

  const until =
    days === null ? null : new Date(carryOver.getTime() + days * 86_400_000);

  // Keep the original start date when a period is being extended — "PLUS since
  // March" is what support needs to see, not the date of the latest renewal.
  const since = current?.plan === plan && current.planSince !== null ? current.planSince : now;

  await db.userSettings.upsert({
    where: { userId },
    create: { userId, plan, planSince: since, planUntil: until },
    update: { plan, planSince: since, planUntil: until },
  });

  console.info(
    `[subscription] activated: user=${userId} plan=${plan} until=${until?.toISOString() ?? "never"} source=${source}`,
  );

  return { plan, until: until?.toISOString() ?? null };
}

/**
 * Drop an account back to FREE immediately — a refund, a chargeback, or a
 * mistake being corrected. Clears the period rather than backdating it, so the
 * row cannot later read as "expired PLUS" and confuse a support conversation.
 */
export async function deactivatePlan(userId: string): Promise<void> {
  await db.userSettings.updateMany({
    where: { userId },
    data: { plan: FREE_PLAN, planSince: null, planUntil: null },
  });

  console.info(`[subscription] deactivated: user=${userId}`);
}

export interface AdminPlanTarget {
  userId: string;
  telegramId: string;
  username: string | null;
  name: string;
}

/**
 * Find the account an activation refers to, by whichever handle support has.
 *
 * Three lookups because a support conversation can start from any of them: the
 * @username someone messaged from, the numeric Telegram id the Mini App knows
 * them by, or the internal row id shown on the subscription screen. Username
 * is matched case-insensitively and with a leading "@" tolerated, because that
 * is how it will be pasted out of a chat.
 */
export async function findPlanTarget(handle: string): Promise<AdminPlanTarget | null> {
  const trimmed = handle.trim().replace(/^@/, "");
  if (trimmed === "") return null;

  // The username arm is a `contains` narrowed in JS rather than a case-
  // insensitive `equals`: Prisma's `mode: "insensitive"` is a PostgreSQL
  // feature and this app is on SQLite until the adapter swap. `contains` maps
  // to LIKE, which SQLite already folds case for ASCII, and the exact
  // comparison below is what stops a partial match activating a stranger.
  const candidates = await db.user.findMany({
    where: {
      OR: [{ id: trimmed }, { telegramId: trimmed }, { username: { contains: trimmed } }],
    },
    select: { id: true, telegramId: true, username: true, firstName: true, lastName: true },
    take: 25,
  });

  const lower = trimmed.toLowerCase();
  const user =
    candidates.find(
      (row) =>
        row.id === trimmed || row.telegramId === trimmed || row.username?.toLowerCase() === lower,
    ) ?? null;
  if (!user) return null;

  return {
    userId: user.id,
    telegramId: user.telegramId,
    username: user.username,
    name: [user.firstName, user.lastName].filter(Boolean).join(" "),
  };
}

/** Whether a tier id names a paid tier — the guard the admin endpoint uses. */
export function isGrantablePlan(plan: PlanId): boolean {
  return isPaidPlan(plan);
}
