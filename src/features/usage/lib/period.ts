import {
  addDays,
  addMonths,
  startOfMonth,
  startOfWeek,
  type CalendarDay,
} from "@/shared/lib/calendar-day";

/**
 * The two keys a usage row is filed under, derived from the user's own
 * calendar day.
 *
 * Both are plain strings rather than DateTimes on purpose, and it is the same
 * reasoning CalendarDay itself is built on: a billing month is not an instant.
 * "2026-08" is the same month for a user in Moscow and one in London even
 * though the two are in different UTC days for three hours every evening, and a
 * DATETIME column would force a timezone onto a fact that has none.
 *
 * Deriving both from a CalendarDay — which is already resolved from
 * Profile.timezone server-side — means a user's month rolls over at their own
 * midnight, with nothing scheduled and nothing to run in any zone.
 */

/** "2026-08" — the month key a UserUsage row is filed under. */
export function periodMonthOf(day: CalendarDay): string {
  return day.slice(0, 7);
}

/**
 * "2026-08-03" — the Monday of the week a food analysis counts against.
 *
 * The Monday date rather than an ISO week number ("2026-W32"): week numbering
 * has edge cases at the turn of the year that a date does not, and this key is
 * also directly printable as "новый анализ будет 10 августа".
 */
export function weekKeyOf(day: CalendarDay): CalendarDay {
  return startOfWeek(day);
}

/** The first day of next month — when a monthly allowance refills. */
export function nextMonthStart(day: CalendarDay): CalendarDay {
  return startOfMonth(addMonths(day, 1));
}

/** Next Monday — when a weekly allowance refills. */
export function nextWeekStart(day: CalendarDay): CalendarDay {
  return addDays(weekKeyOf(day), 7);
}
