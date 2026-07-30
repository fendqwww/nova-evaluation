"use server";

import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { calculateLifeScore } from "@/features/life-score/server/calculate-life-score";
import { generateInsights } from "@/features/insights/server/generate-insights";
import {
  getActivityCounts,
  getFocusOfDay,
} from "@/features/activity/server/activity.repository";
import type { PrimaryGoalValue } from "@/features/onboarding/schemas";

export async function getDashboardData(rawInitData: string | undefined) {
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
    include: { profile: true },
  });

  if (!user.profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const [counts, focus] = await Promise.all([
    getActivityCounts(user.id),
    getFocusOfDay(user.id),
  ]);

  const lifeScore = calculateLifeScore({
    hasCompletedProfile: true,
    heightCm: user.profile.heightCm,
    weightKg: user.profile.weightKg,
    goalsCount: counts.goals,
    habitsCount: counts.habits,
    tasksCount: counts.tasks,
  });

  const firstName = user.profile.name.split(" ")[0] || user.firstName;

  // Coach mode (limit: 3) is computed up-front so opening the AI Coach
  // modal is instant — no second round trip, just slicing an array we
  // already have client-side.
  const insights = generateInsights(
    {
      firstName,
      primaryFocus: user.profile.primaryGoal as PrimaryGoalValue,
      goalsCount: counts.goals,
      habitsCount: counts.habits,
      tasksCount: counts.tasks,
      lifeScore: lifeScore.score,
    },
    { limit: 3 },
  );

  return {
    user: {
      firstName,
      photoUrl: user.photoUrl,
    },
    timezone: user.profile.timezone,
    lifeScore,
    insights,
    focus,
    counts,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
