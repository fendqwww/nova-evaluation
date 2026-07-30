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
