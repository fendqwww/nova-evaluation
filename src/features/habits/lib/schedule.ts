import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import {
  WEEKDAY_SHORT,
  diffDays,
  weekdayIndex,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { EVERY_WEEKDAY_MASK } from "@/features/habits/schemas";
import type { HabitSchedule } from "@/features/habits/types";

/**
 * What the schedule says about a given day.
 *
 * The distinction that matters everywhere downstream is between a day the
 * habit was *due* and a day it simply wasn't. Skipping Saturday on a
 * weekday-only habit is not a miss, and treating it as one would make every
 * such habit look permanently broken.
 *
 * A "weekly" habit has no due days at all — it has a weekly quota — so
 * isScheduledOn is false for it by design and callers must go through the
 * week-based helpers instead. isTrackedDaily() is the guard for that.
 */

/** True when the schedule assigns specific days rather than a weekly quota. */
export function isTrackedDaily(schedule: HabitSchedule): boolean {
  return schedule.kind !== "weekly";
}

export function isScheduledOn(schedule: HabitSchedule, day: CalendarDay): boolean {
  switch (schedule.kind) {
    case "daily":
      return true;
    case "weekdays":
      return hasWeekday(schedule.weekdayMask, weekdayIndex(day));
    case "weekly":
      // Any day can count toward the quota, but no single day is owed.
      return false;
  }
}

/**
 * Whether a day can be ticked at all.
 *
 * Backdating is allowed — people do remember the run they forgot to log — but
 * the future is not yet a thing that happened, so it cannot be marked done.
 */
export function isTickable(day: CalendarDay, today: CalendarDay): boolean {
  return diffDays(day, today) >= 0;
}

// ---------------------------------------------------------------------------
// Weekday bitmask — bit 0 = Monday … bit 6 = Sunday
// ---------------------------------------------------------------------------

export function hasWeekday(mask: number, index: number): boolean {
  return (mask & (1 << index)) !== 0;
}

export function toggleWeekday(mask: number, index: number): number {
  return mask ^ (1 << index);
}

export function weekdayList(mask: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((index) => hasWeekday(mask, index));
}

export function countWeekdays(mask: number): number {
  return weekdayList(mask).length;
}

const WEEKDAY_MASK_ALL_WEEK = EVERY_WEEKDAY_MASK;
const WEEKDAY_MASK_WORKWEEK = 0b0011111; // Mon–Fri
const WEEKDAY_MASK_WEEKEND = 0b1100000; // Sat–Sun

// ---------------------------------------------------------------------------
// Expected volume
// ---------------------------------------------------------------------------

/**
 * How many ticks the schedule asks for across an inclusive day range.
 *
 * This is the denominator of every adherence percentage, so the three kinds
 * have to be commensurable. Daily and weekdays count real due days. Weekly
 * prorates its quota across the range (4 times a week over 14 days = 8), which
 * is the only way to compare "3 раза в неделю" against "каждый день" on one
 * scale without inventing week boundaries the range doesn't have.
 */
export function expectedInRange(
  schedule: HabitSchedule,
  from: CalendarDay,
  to: CalendarDay,
): number {
  const span = diffDays(from, to) + 1;
  if (span <= 0) return 0;

  switch (schedule.kind) {
    case "daily":
      return span;
    case "weekdays": {
      const perWeek = countWeekdays(schedule.weekdayMask);
      if (perWeek === 0) return 0;
      // Count exactly rather than (span / 7) * perWeek: over a 10-day window
      // the approximation is off by a day or two depending on where the window
      // starts, and an adherence figure that drifts with the calendar is worse
      // than one that is simply right.
      let count = 0;
      for (let offset = 0; offset < span; offset += 1) {
        const index = (weekdayIndex(from) + offset) % 7;
        if (hasWeekday(schedule.weekdayMask, index)) count += 1;
      }
      return count;
    }
    case "weekly":
      return Math.round((span / 7) * schedule.timesPerWeek);
  }
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** "Каждый день", "Пн, Ср, Пт", "3 раза в неделю". */
export function describeSchedule(schedule: HabitSchedule): string {
  switch (schedule.kind) {
    case "daily":
      return "Каждый день";
    case "weekdays": {
      if (schedule.weekdayMask === WEEKDAY_MASK_ALL_WEEK) return "Каждый день";
      if (schedule.weekdayMask === WEEKDAY_MASK_WORKWEEK) return "По будням";
      if (schedule.weekdayMask === WEEKDAY_MASK_WEEKEND) return "По выходным";
      const days = weekdayList(schedule.weekdayMask).map((index) => WEEKDAY_SHORT[index]);
      return days.join(", ");
    }
    case "weekly":
      return `${schedule.timesPerWeek} ${pluralizeRu(schedule.timesPerWeek, [
        "раз",
        "раза",
        "раз",
      ])} в неделю`;
  }
}

/** The short form for a card's meta line. */
export function scheduleSummary(schedule: HabitSchedule): string {
  if (schedule.kind === "weekdays") {
    const count = countWeekdays(schedule.weekdayMask);
    if (count === 7) return "Каждый день";
    if (schedule.weekdayMask === WEEKDAY_MASK_WORKWEEK) return "По будням";
    if (schedule.weekdayMask === WEEKDAY_MASK_WEEKEND) return "По выходным";
    return `${count} ${pluralizeRu(count, ["день", "дня", "дней"])} в неделю`;
  }
  return describeSchedule(schedule);
}

export const SCHEDULE_PRESETS: { label: string; mask: number }[] = [
  { label: "Каждый день", mask: WEEKDAY_MASK_ALL_WEEK },
  { label: "По будням", mask: WEEKDAY_MASK_WORKWEEK },
  { label: "По выходным", mask: WEEKDAY_MASK_WEEKEND },
];
