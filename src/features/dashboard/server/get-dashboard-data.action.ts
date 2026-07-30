"use server";

import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import {
  getActivityCounts,
  getFocusOfDay,
} from "@/features/activity/server/activity.repository";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import type { CoachBulletTone } from "@/features/coach/types";

/**
 * The Dashboard in one fetch.
 *
 * The Life Score and the Coach preview both come out of buildCoachAnalysis
 * rather than being computed here. That is the point: this action used to run
 * its own habit/task aggregates and its own rule-based insight generator, which
 * meant the Dashboard and the Coach were two independent opinions about the
 * same day and could disagree about the score, about what was overdue, or about
 * what to do next. One analysis, two renderings.
 *
 * The preview is deliberately a slice of the real answer — the same headline
 * and body the Coach screen leads with — so tapping the card continues a
 * thought rather than replacing it with a different one.
 */
export async function getDashboardData(rawInitData: string | undefined) {
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
    include: { profile: true },
  });

  if (!user.profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const timezone = user.profile.timezone;

  const [analysis, counts, focus] = await Promise.all([
    buildCoachAnalysis(user.id, timezone),
    getActivityCounts(user.id),
    getFocusOfDay(user.id),
  ]);

  const brief = composeAnswer("brief", analysis);

  // The loudest bullet, not the first: a critical line buried under two
  // neutral ones is exactly the thing a one-line preview exists to surface.
  const severity: Record<CoachBulletTone, number> = {
    critical: 0,
    warning: 1,
    positive: 2,
    neutral: 3,
  };
  const highlight =
    [...brief.bullets].sort((a, b) => severity[a.tone] - severity[b.tone])[0] ?? null;

  return {
    user: {
      firstName: analysis.profile.firstName,
      photoUrl: user.photoUrl,
    },
    timezone,
    lifeScore: analysis.metrics.lifeScore,
    coach: {
      headline: brief.headline,
      body: brief.body,
      highlight: highlight ? { text: highlight.text, tone: highlight.tone } : null,
      /** Points still available today — 0 when there is nothing left to gain. */
      potential: analysis.potential.total,
    },
    focus,
    counts,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
