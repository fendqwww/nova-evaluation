import { addDays, daysBetween, startOfWeek, type CalendarDay } from "@/shared/lib/calendar-day";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * Everything the UI knows about a day or a range of days, derived from logs —
 * pure and synchronous, the same convention workouts/lib/stats.ts and
 * nutrition/lib/stats.ts use: nothing here is ever stored, so correcting a
 * night is right on the next render rather than after a refetch.
 */

/** 8 hours. Fixed rather than user-configurable for now — a target every
 *  sleep tracker defaults to, and this section carries no goal-setting
 *  screen the way Nutrition's macro targets do. */
export const SLEEP_GOAL_MIN = 480;

export function logOnDay(logs: SleepLogItem[], day: CalendarDay): SleepLogItem | null {
  return logs.find((log) => log.day === day) ?? null;
}

export interface SleepDaySummary {
  day: CalendarDay;
  durationMin: number;
  quality: number | null;
}

/** One row per day in the range, ascending — the series the week chart reads. */
export function dailySeries(
  logs: SleepLogItem[],
  from: CalendarDay,
  to: CalendarDay,
): SleepDaySummary[] {
  return daysBetween(from, to).map((day) => {
    const log = logOnDay(logs, day);
    return { day, durationMin: log?.durationMin ?? 0, quality: log?.quality ?? null };
  });
}

export interface SleepWeekStats {
  /** Days with a logged night, out of seven. */
  daysLogged: number;
  averageDurationMin: number;
  averageQuality: number;
  /** Days that reached the 8h goal. */
  daysOnTarget: number;
}

/** The current calendar week (Monday–Sunday) against the fixed goal. */
export function weekStats(logs: SleepLogItem[], today: CalendarDay): SleepWeekStats {
  const from = startOfWeek(today);
  const series = dailySeries(logs, from, today);
  const logged = series.filter((day) => day.durationMin > 0);

  const averageDurationMin =
    logged.length === 0
      ? 0
      : Math.round(logged.reduce((total, day) => total + day.durationMin, 0) / logged.length);

  const qualities = logged.map((day) => day.quality).filter((value): value is number => value !== null);
  const averageQuality =
    qualities.length === 0
      ? 0
      : Math.round((qualities.reduce((total, value) => total + value, 0) / qualities.length) * 10) / 10;

  return {
    daysLogged: logged.length,
    averageDurationMin,
    averageQuality,
    daysOnTarget: logged.filter((day) => day.durationMin >= SLEEP_GOAL_MIN).length,
  };
}

/**
 * Consecutive days up to and including `today` with a logged night.
 *
 * An unlogged today is pending, not a break: the night is keyed by the morning
 * woken up on, so before the user logs it the streak counts back from
 * yesterday instead of reading zero. Same rule habits/lib/stats.ts follows for
 * a habit due today and not yet done — a streak that collapses every morning
 * and returns an hour later is wrong, and the Coach quotes this number.
 */
export function loggingStreak(logs: SleepLogItem[], today: CalendarDay): number {
  const loggedDays = new Set(logs.map((log) => log.day));
  let streak = 0;
  let day = loggedDays.has(today) ? today : addDays(today, -1);
  while (loggedDays.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export interface SleepOverallStats {
  totalLogged: number;
  averageDurationMinAll: number;
  averageQualityAll: number;
}

/** Everything in the loaded window, for the stats tab's summary block. */
export function overallStats(logs: SleepLogItem[]): SleepOverallStats {
  const averageDurationMinAll =
    logs.length === 0
      ? 0
      : Math.round(logs.reduce((total, log) => total + log.durationMin, 0) / logs.length);

  const averageQualityAll =
    logs.length === 0
      ? 0
      : Math.round((logs.reduce((total, log) => total + log.quality, 0) / logs.length) * 10) / 10;

  return { totalLogged: logs.length, averageDurationMinAll, averageQualityAll };
}
