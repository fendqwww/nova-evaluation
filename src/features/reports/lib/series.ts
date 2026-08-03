import { daysBetween, dayInZone, type CalendarDay } from "@/shared/lib/calendar-day";
import { sessionStats } from "@/features/workouts/lib/stats";
import { dailySeries as nutritionDailySeries } from "@/features/nutrition/lib/stats";
import { dailySeries as sleepDailySeries } from "@/features/sleep/lib/stats";
import type { HabitItem } from "@/features/habits/types";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";
import type { NutritionEntryItem, NutritionWaterItem } from "@/features/nutrition/types";
import type { SleepLogItem } from "@/features/sleep/types";
import type { TaskItem } from "@/features/tasks/types";
import type { ReportsDayPoint } from "@/features/reports/types";

/**
 * One row per day in [from, to], built once server-side rather than shipping
 * every raw log to the client. Nutrition and sleep already have their own
 * dailySeries helpers (reused as-is); habits, tasks and workouts do not, so
 * their bucketing lives here rather than in each feature's own lib — Reports
 * is the only reader that needs a day-by-day count across *every* item in a
 * section at once.
 */
export function buildReportsSeries(
  from: CalendarDay,
  to: CalendarDay,
  timezone: string,
  habits: HabitItem[],
  tasks: TaskItem[],
  workouts: WorkoutItem[],
  sessions: WorkoutSessionItem[],
  entries: NutritionEntryItem[],
  water: NutritionWaterItem[],
  sleepLogs: SleepLogItem[],
): ReportsDayPoint[] {
  const days = daysBetween(from, to);

  const activeHabitLogs = habits
    .filter((habit) => habit.archivedAt === null)
    .map((habit) => new Set(habit.log));

  const taskDayCounts = new Map<CalendarDay, number>();
  for (const task of tasks) {
    if (!task.isCompleted || !task.completedAt) continue;
    const day = dayInZone(new Date(task.completedAt), timezone);
    taskDayCounts.set(day, (taskDayCounts.get(day) ?? 0) + 1);
  }

  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const workoutDayVolume = new Map<CalendarDay, number>();
  const workoutDayCount = new Map<CalendarDay, number>();
  for (const session of sessions) {
    if (session.completedAt === null) continue;
    const volume = sessionStats(session, workoutById.get(session.workoutId)).volumeKg;
    workoutDayVolume.set(session.day, (workoutDayVolume.get(session.day) ?? 0) + volume);
    workoutDayCount.set(session.day, (workoutDayCount.get(session.day) ?? 0) + 1);
  }

  const nutritionByDay = new Map(
    nutritionDailySeries(entries, water, from, to).map((point) => [point.day, point]),
  );
  const sleepByDay = new Map(sleepDailySeries(sleepLogs, from, to).map((point) => [point.day, point]));

  return days.map((day) => ({
    day,
    habitsDone: activeHabitLogs.reduce((total, log) => total + (log.has(day) ? 1 : 0), 0),
    tasksCompleted: taskDayCounts.get(day) ?? 0,
    workoutsDone: workoutDayCount.get(day) ?? 0,
    workoutVolumeKg: Math.round(workoutDayVolume.get(day) ?? 0),
    nutritionCalories: nutritionByDay.get(day)?.calories ?? 0,
    waterMl: nutritionByDay.get(day)?.waterMl ?? 0,
    sleepDurationMin: sleepByDay.get(day)?.durationMin ?? 0,
  }));
}
