import "server-only";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";

/**
 * The verified caller's own row id.
 *
 * Identity is re-derived from initData on every call, so the client's claim
 * about who it is never reaches a query. Every goal mutation then scopes its
 * where-clause by this id, which is what stops a forged row id in a request
 * body from touching another user's data.
 *
 * Existing actions inline this same two-step lookup; they keep working
 * untouched, and this is the shared version for everything written from here
 * on.
 */
export async function requireUserId(
  rawInitData: string | undefined,
): Promise<string> {
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
    select: { id: true },
  });

  return user.id;
}

export interface UserContext {
  userId: string;
  /** IANA zone from the profile — the authority on which day "today" is. */
  timezone: string;
}

/**
 * The caller's id plus the timezone their calendar days are measured in.
 *
 * Habits and Tasks both need to know which day it is for this specific user,
 * and that answer must not come from the client: a device with a wrong clock
 * would otherwise be able to backdate a habit log and manufacture a streak.
 * Profile.timezone is the declared zone, so it is what decides.
 *
 * Falls back to UTC for the window between a User row existing and its Profile
 * being written — onboarding creates both together, so in practice this only
 * covers a half-finished signup, where erroring out would be worse than being
 * a few hours off.
 */
export async function requireUserContext(
  rawInitData: string | undefined,
): Promise<UserContext> {
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
    select: { id: true, profile: { select: { timezone: true } } },
  });

  return { userId: user.id, timezone: user.profile?.timezone ?? "UTC" };
}
