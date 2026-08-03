"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import { getSettings } from "@/features/settings/server/settings.repository";
import { getAiUsageStatus } from "@/ai/limits";
import { listHabits } from "@/features/habits/server/habits.repository";
import { listTasks } from "@/features/tasks/server/tasks.repository";
import { listWorkouts, listSessions } from "@/features/workouts/server/workouts.repository";
import { listEntries, listWater } from "@/features/nutrition/server/nutrition.repository";
import { listLogs as listSleepLogs } from "@/features/sleep/server/sleep.repository";
import { weekStats as sleepWeekStats, loggingStreak as sleepLoggingStreak } from "@/features/sleep/lib/stats";
import { buildReportsSeries } from "@/features/reports/lib/series";
import type { ReportsSnapshot } from "@/features/reports/types";

/** How far back the Weekly/Monthly charts reach. Bounded independently of
 *  each section's own history window — Reports asks for exactly the 30 days
 *  it renders, not whatever the Workouts or Nutrition screen happens to load.
 *  Not exported: a "use server" file may only export async functions. */
const REPORTS_WINDOW_DAYS = 30;

/**
 * The Отчёты screen in one fetch.
 *
 * Everything scored (Life Score, habit/task/goal/workout/nutrition/appearance
 * facts) comes from buildCoachAnalysis — the same function the Dashboard and
 * the Coach call — so this screen can never compute a different Life Score or
 * disagree about what is owed today. The raw lists fetched here on top of it
 * exist for exactly one thing the analysis does not carry: a 30-day
 * day-by-day series for the charts (see lib/series.ts).
 */
export async function getReports(rawInitData: string | undefined): Promise<ReportsSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);
  const today = todayIn(timezone);
  const windowStart = addDays(today, -(REPORTS_WINDOW_DAYS - 1));

  const [analysis, settings, habits, tasks, workouts, sessions, entries, water, sleepLogs] =
    await Promise.all([
      buildCoachAnalysis(userId, timezone),
      getSettings(userId),
      listHabits(userId, timezone, windowStart),
      listTasks(userId),
      listWorkouts(userId, timezone),
      listSessions(userId, windowStart),
      listEntries(userId, windowStart),
      listWater(userId, windowStart),
      listSleepLogs(userId, windowStart),
    ]);

  const series = buildReportsSeries(
    windowStart,
    today,
    timezone,
    habits,
    tasks,
    workouts,
    sessions,
    entries,
    water,
    sleepLogs,
  );

  const aiUsage = await getAiUsageStatus(userId, settings.plan, today);
  const sleepWeek = sleepWeekStats(sleepLogs, today);

  return {
    today,
    windowStart,
    series,
    lifeScore: analysis.metrics.lifeScore,
    habits: {
      activeCount: analysis.habits.length,
      dueToday: analysis.metrics.habitsDue,
      doneToday: analysis.metrics.habitsDone,
      adherenceWeek: analysis.metrics.habitAdherence,
      top: [...analysis.habits]
        .sort((a, b) => b.currentStreak - a.currentStreak || b.adherence - a.adherence)
        .slice(0, 5)
        .map((habit) => ({
          id: habit.id,
          title: habit.title,
          adherence: habit.adherence,
          currentStreak: habit.currentStreak,
          streakUnit: habit.streakUnit,
        })),
    },
    tasks: {
      open: analysis.metrics.tasksOpen,
      overdue: analysis.metrics.tasksOverdue,
      completedWeek: analysis.metrics.tasksCompletedWeek,
    },
    goals: {
      active: analysis.metrics.goalsActive,
      completed: analysis.metrics.goalsCompleted,
      items: analysis.goals
        .filter((goal) => !goal.isCompleted)
        .slice(0, 6)
        .map((goal) => ({ id: goal.id, title: goal.title, percent: goal.percent, daysLeft: goal.daysLeft })),
    },
    workouts: {
      weekDone: analysis.metrics.workoutsWeek,
      volumeWeekKg: analysis.metrics.workoutVolumeWeek,
      adherenceWeek: analysis.metrics.workoutAdherence,
    },
    nutrition: {
      hasGoal: analysis.nutrition.hasGoal,
      caloriesToday: Math.round(analysis.nutrition.caloriesToday),
      caloriesGoal: analysis.nutrition.caloriesGoal,
      waterTodayMl: analysis.nutrition.waterTodayMl,
      waterGoalMl: analysis.nutrition.waterGoalMl,
      daysLoggedWeek: analysis.metrics.nutritionDaysWeek,
      streak: analysis.nutrition.loggingStreak,
    },
    sleep: {
      hasLogs: sleepLogs.length > 0,
      averageDurationMin: sleepWeek.averageDurationMin,
      averageQuality: sleepWeek.averageQuality,
      daysLoggedWeek: sleepWeek.daysLogged,
      streak: sleepLoggingStreak(sleepLogs, today),
    },
    appearance: {
      activeCount: analysis.appearance.activeCount,
      dueToday: analysis.appearance.dueToday,
      doneToday: analysis.appearance.doneToday,
      streak: analysis.appearance.streak,
      weakestArea: analysis.appearance.weakestArea,
      adherenceWeek: analysis.appearance.adherence,
    },
    profile: {
      heightCm: analysis.profile.heightCm,
      weightKg: analysis.profile.weightKg,
      bmi: analysis.profile.bmi,
      bmiLabel: analysis.profile.bmiLabel,
    },
    aiSummary: composeAnswer("brief", analysis),
    aiUsage: { used: aiUsage.used, limit: aiUsage.limit },
  };
}
