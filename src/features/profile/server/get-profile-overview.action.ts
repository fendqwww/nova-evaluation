"use server";

import { db } from "@/server/db";
import { requireUserContext } from "@/server/auth/current-user";
import { dayInZone, diffDays, todayIn } from "@/shared/lib/calendar-day";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { getSettings } from "@/features/settings/server/settings.repository";
import {
  computeStreak,
  getActivityDays,
  getProfileTotals,
} from "@/features/profile/server/profile.repository";
import { ACTIVITY_WINDOW_DAYS } from "@/features/profile/lib/constants";
import type { ProfileOverview } from "@/features/profile/types";

/**
 * The Профиль screen in one fetch.
 *
 * The Life Score, the section counters and the AI facts all come out of
 * buildCoachAnalysis rather than being recomputed here, and that is the whole
 * point: this screen shows the user the number the Dashboard shows and the data
 * the Coach reasons over, so it must not be a second opinion about either. The
 * same call get-dashboard-data.action.ts makes, for the same reason.
 *
 * It is the expensive part of this action — the analysis reads every section —
 * and it is accepted knowingly. A profile screen is opened occasionally, and
 * the alternative (a cheaper, parallel set of aggregates) is precisely how two
 * screens end up disagreeing about a user's own score.
 *
 * What the analysis cannot answer is history: it is built around today and
 * yesterday, so lifetime totals and the activity series come from
 * profile.repository.ts instead.
 */
export async function getProfileOverview(
  rawInitData: string | undefined,
): Promise<ProfileOverview> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      photoUrl: true,
      createdAt: true,
    },
  });

  // The account's own first day is the floor for every all-time figure: asking
  // for care completions "since the beginning of time" would walk a year of
  // empty days for an account that is a week old.
  const since = dayInZone(user.createdAt, timezone);

  const [analysis, settings, totals, activity] = await Promise.all([
    buildCoachAnalysis(userId, timezone),
    getSettings(userId),
    getProfileTotals(userId, timezone, today, since),
    getActivityDays(userId, timezone, today, ACTIVITY_WINDOW_DAYS),
  ]);

  return {
    today,
    account: {
      name: analysis.profile.firstName,
      telegramName: [user.firstName, user.lastName].filter(Boolean).join(" "),
      username: user.username,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt.toISOString(),
      // Inclusive of today, so a brand-new account reads "1 день" rather than
      // "0 дней" — it is a count of days with Nova, not of elapsed intervals.
      daysWithNova: diffDays(since, today) + 1,
      plan: settings.plan,
    },
    lifeScore: analysis.metrics.lifeScore,
    streak: computeStreak(activity, today),
    totals,
    counts: {
      goalsActive: analysis.metrics.goalsActive,
      // The analysis already filters archived habits and programmes out of its
      // fact lists, which is the same definition the Dashboard tiles use.
      habitsActive: analysis.habits.length,
      tasksOpen: analysis.metrics.tasksOpen,
      workoutsActive: analysis.workouts.length,
    },
    activity,
    ai: {
      age: analysis.profile.age,
      heightCm: analysis.profile.heightCm,
      weightKg: analysis.profile.weightKg,
      gender: analysis.profile.gender,
      bmi: analysis.profile.bmi,
      bmiLabel: analysis.profile.bmiLabel,
      occupation: analysis.profile.occupation,
      primaryGoal: analysis.profile.primaryGoal,
      timezone: analysis.profile.timezone,
      activeGoalTitles: analysis.goals
        .filter((goal) => !goal.isCompleted)
        .map((goal) => goal.title),
      isCoachEnabled: settings.ai.coachEnabled,
    },
  };
}
