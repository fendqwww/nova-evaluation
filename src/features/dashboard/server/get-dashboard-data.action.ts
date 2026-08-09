"use server";

import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import {
  getActivityCounts,
  getFocusOfDay,
} from "@/features/activity/server/activity.repository";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import { listEntries, listWater, getGoal } from "@/features/nutrition/server/nutrition.repository";
import { dayProgress } from "@/features/nutrition/lib/stats";
import { listLogs as listSleepLogs } from "@/features/sleep/server/sleep.repository";
import { sleepScore, sleepScoreLabel } from "@/features/sleep/lib/score";
import { listWorkouts, listSessions } from "@/features/workouts/server/workouts.repository";
import { workoutStats } from "@/features/workouts/lib/stats";
import type { CoachBulletTone } from "@/features/coach/types";

/** How far back the health queries reach. Enough for the sleep norm's fortnight. */
const HEALTH_WINDOW_DAYS = 16;

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
 * WHAT CHANGED, AND WHY IT MATTERS. This action used to return the score, the
 * coach preview, the focus of the day and three counts of goals/habits/tasks —
 * and not one number about the user's body. The home screen of a health product
 * could not tell you what you had eaten, how you had slept, or whether you had
 * trained, and every one of those answers was two taps away behind a tab called
 * "Здоровье". The `today` block below is the fix, and it is why the screen can
 * now lead with a body rather than with a to-do list.
 *
 * All of it lands in one Promise.all. The repositories already existed; nothing
 * here is a new query pattern, only a wider one.
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
  const today = todayIn(timezone);
  const windowStart = addDays(today, -HEALTH_WINDOW_DAYS);

  const [
    analysis,
    counts,
    focus,
    entries,
    water,
    goal,
    sleepLogs,
    workouts,
    sessions,
  ] = await Promise.all([
    buildCoachAnalysis(user.id, timezone),
    getActivityCounts(user.id),
    getFocusOfDay(user.id),
    listEntries(user.id, windowStart),
    listWater(user.id, windowStart),
    getGoal(user.id),
    listSleepLogs(user.id, windowStart),
    listWorkouts(user.id, timezone),
    listSessions(user.id, windowStart),
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

  const nutrition = dayProgress(entries, water, goal, today);

  // Last night is keyed to the morning woken up on, so "today" is the right key
  // — see the note on SleepLogItem.
  const sleep = sleepScore(sleepLogs, today, today);

  const activeWorkouts = workouts.filter((workout) => workout.archivedAt === null);
  const todayWorkouts = activeWorkouts
    .map((workout) => ({ workout, stats: workoutStats(workout, sessions, today, windowStart) }))
    .filter((row) => row.stats.isPlannedToday || row.stats.isDoneToday || row.stats.isOpenToday);

  const doneToday = todayWorkouts.filter((row) => row.stats.isDoneToday).length;
  const openToday = todayWorkouts.find((row) => row.stats.isOpenToday) ?? null;
  const nextToday = todayWorkouts.find((row) => !row.stats.isDoneToday) ?? null;

  return {
    user: {
      firstName: analysis.profile.firstName,
      photoUrl: user.photoUrl,
    },
    timezone,
    today,
    lifeScore: analysis.metrics.lifeScore,
    coach: {
      headline: brief.headline,
      body: brief.body,
      highlight: highlight ? { text: highlight.text, tone: highlight.tone } : null,
      /** Points still available today — 0 when there is nothing left to gain. */
      potential: analysis.potential.total,
    },
    /**
     * The body, today. Every field here is a real reading or an explicit null —
     * nothing is defaulted to zero, because "0 ккал" and "not logged yet" are
     * different states and the tiles render them differently.
     */
    todayHealth: {
      nutrition: {
        calories: Math.round(nutrition.calories.value),
        caloriesGoal: nutrition.calories.goal,
        ratio: nutrition.calories.ratio,
        proteinG: Math.round(nutrition.proteinG.value),
        proteinGoal: nutrition.proteinG.goal,
        hasGoal: nutrition.calories.goal > 0,
        hasEntries: nutrition.calories.value > 0,
      },
      water: {
        ml: nutrition.waterMl.value,
        goalMl: nutrition.waterMl.goal,
        ratio: nutrition.waterMl.ratio,
      },
      sleep: {
        score: sleep.score,
        label: sleepScoreLabel(sleep.score),
        durationMin: sleep.score === null ? null : sleep.norm.targetMin - sleep.deficitMin,
        normMin: sleep.norm.targetMin,
        isPersonalNorm: sleep.norm.isPersonal,
      },
      workout: {
        /** The programme to open — the one in progress, else the next one due. */
        title: (openToday ?? nextToday)?.workout.title ?? null,
        workoutId: (openToday ?? nextToday)?.workout.id ?? null,
        plannedToday: todayWorkouts.length,
        doneToday,
        isOpen: openToday !== null,
        isRestDay: todayWorkouts.length === 0,
      },
    },
    focus,
    counts,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
