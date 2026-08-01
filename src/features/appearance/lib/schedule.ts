import {
  countWeekdays as countWeekdaysBase,
  describeSchedule as describeScheduleBase,
  expectedInRange as expectedInRangeBase,
  hasWeekday as hasWeekdayBase,
  isScheduledOn as isScheduledOnBase,
  isTickable as isTickableBase,
  isTrackedDaily as isTrackedDailyBase,
  scheduleSummary as scheduleSummaryBase,
  toggleWeekday as toggleWeekdayBase,
  weekdayList as weekdayListBase,
  SCHEDULE_PRESETS as SCHEDULE_PRESETS_BASE,
} from "@/features/habits/lib/schedule";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { CareSchedule } from "@/features/appearance/types";

/**
 * A routine's calendar is a habit's calendar.
 *
 * CareSchedule and HabitSchedule are the same three shapes over the same three
 * columns, and that is deliberate rather than accidental: "по будням" has to
 * mean the same days in both sections, and prorating "3 раза в неделю" across a
 * window has exactly one right answer. So this module re-exports the habits
 * implementation under CareSchedule signatures instead of restating 150 lines
 * of bitmask and quota arithmetic that would then be free to drift.
 *
 * The wrappers are types-only — every function below is the habits one, called
 * with the same argument. TypeScript's structural typing makes the casts
 * unnecessary at runtime; the point is that appearance code never has to name
 * HabitSchedule to say something about a care routine.
 */

export function isTrackedDaily(schedule: CareSchedule): boolean {
  return isTrackedDailyBase(schedule);
}

export function isScheduledOn(schedule: CareSchedule, day: CalendarDay): boolean {
  return isScheduledOnBase(schedule, day);
}

/** Backdating is allowed — people remember the evening routine they forgot. */
export function isTickable(day: CalendarDay, today: CalendarDay): boolean {
  return isTickableBase(day, today);
}

export function expectedInRange(
  schedule: CareSchedule,
  from: CalendarDay,
  to: CalendarDay,
): number {
  return expectedInRangeBase(schedule, from, to);
}

/** "Каждый день", "Пн, Ср, Пт", "3 раза в неделю". */
export function describeSchedule(schedule: CareSchedule): string {
  return describeScheduleBase(schedule);
}

/** The short form for a card's meta line. */
export function scheduleSummary(schedule: CareSchedule): string {
  return scheduleSummaryBase(schedule);
}

export const hasWeekday = hasWeekdayBase;
export const toggleWeekday = toggleWeekdayBase;
export const weekdayList = weekdayListBase;
export const countWeekdays = countWeekdaysBase;
export const SCHEDULE_PRESETS = SCHEDULE_PRESETS_BASE;
