import "server-only";
import { db } from "@/server/db";
import type { PlanId } from "@/features/settings/types";
import type { AiFeature } from "@/ai/types";

/**
 * One shared budget across every AI surface — Coach, food-photo analysis,
 * appearance-photo analysis alike — not three separate ceilings. FREE stops
 * at a fixed lifetime count; PLUS and MAX never check it. Centralized here so
 * a future fourth AI feature (or a pricing change) is a read of this one file
 * rather than a hunt through three server actions for a hardcoded `5`.
 */
export const AI_PLAN_LIMITS: Record<PlanId, number | null> = {
  free: 5,
  plus: null,
  max: null,
};

export interface AiUsageStatus {
  /** null means unlimited. */
  limit: number | null;
  used: number;
  allowed: boolean;
}

/**
 * Whether this user has budget left, without spending any of it.
 *
 * Callers check this *before* paying for a Gemini call — an analysis that
 * will be refused should never reach the model. Recording the spend is a
 * separate step (see recordAiUsage) so a failed or timed-out call never
 * silently consumes a unit the user got nothing for.
 */
export async function getAiUsageStatus(userId: string, plan: PlanId): Promise<AiUsageStatus> {
  const limit = AI_PLAN_LIMITS[plan];
  const row = await db.userSettings.findUnique({
    where: { userId },
    select: { aiUsageCount: true },
  });
  const used = row?.aiUsageCount ?? 0;

  return { limit, used, allowed: limit === null || used < limit };
}

/**
 * One AI call that actually produced a usable result, charged to the shared
 * counter.
 *
 * A plain atomic increment — the DB, not a read-modify-write in this process,
 * is what makes two concurrent calls from the same user land correctly rather
 * than racing on a value read a moment earlier. Unlimited plans still record
 * usage (for the settings screen and for future analytics); they are simply
 * never compared against a ceiling.
 *
 * `feature` is accepted for the call site to be self-documenting and for
 * future per-feature logging — the counter itself does not split by it,
 * because the product's limit is one shared budget, not three.
 */
export async function recordAiUsage(userId: string, feature: AiFeature): Promise<void> {
  await db.userSettings.upsert({
    where: { userId },
    create: { userId, aiUsageCount: 1 },
    update: { aiUsageCount: { increment: 1 } },
  });
  console.info(`[ai] usage recorded: user=${userId} feature=${feature}`);
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
export async function requireAiBudget(userId: string, plan: PlanId): Promise<void> {
  const status = await getAiUsageStatus(userId, plan);
  if (!status.allowed) {
    throw new AiLimitExceededError(status.used, status.limit ?? 0);
  }
}
