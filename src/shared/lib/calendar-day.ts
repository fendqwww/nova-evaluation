/**
 * A calendar day — "YYYY-MM-DD" — and the arithmetic that goes with it.
 *
 * Habits and Tasks both hinge on the question "which day is it *for this
 * user*", and that is not a question an instant can answer: 2026-07-30T22:00Z
 * is the 30th in London and the 31st in Moscow. Storing and comparing days as
 * plain strings makes the ambiguity impossible to reintroduce — there is no
 * timezone attached to a CalendarDay because there is nothing to attach one to.
 *
 * The rules this module enforces:
 *   1. "Today" is derived server-side from Profile.timezone, never from the
 *      client's clock. A device with a wrong date must not be able to backdate
 *      a habit log, and a user crossing a timezone should not see their day
 *      flip based on where their phone thinks it is.
 *   2. Days persist as UTC-midnight DATETIME columns, the same convention
 *      Goal.targetDate already uses. dayToDate/dateToDay are the only places
 *      that conversion happens.
 *
 * Goals keeps its own ISO-string helpers in features/goals/lib/format.ts. They
 * are untouched on purpose: that section is finished and working, it passes
 * full ISO strings rather than CalendarDays, and rewriting it to route through
 * here would be a refactor of shipped code for no user-visible gain.
 */

/** "YYYY-MM-DD". Never an instant, never timezone-bearing. */
export type CalendarDay = string;

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MS_PER_DAY = 86_400_000;

/** Monday-first, matching both the Russian week and the weekday bitmask. */
export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export const MONTH_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * A syntactically well-formed day that also exists.
 *
 * The regex alone accepts "2026-02-30"; Date.UTC silently rolls that over to
 * March 2nd rather than failing, so the round-trip comparison below is what
 * actually rejects it.
 */
export function isValidDay(value: string): value is CalendarDay {
  if (!DAY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** CalendarDay -> the UTC-midnight Date that gets written to the column. */
export function dayToDate(day: CalendarDay): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** A UTC-midnight Date read back out of the column -> CalendarDay. */
export function dateToDay(date: Date): CalendarDay {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * The current calendar day in the given IANA zone.
 *
 * formatToParts rather than a locale that happens to emit ISO order: "en-CA"
 * gives "2026-07-30" on a full-ICU build and something else on a trimmed one,
 * and a date format that depends on how Node was compiled is not a foundation
 * to put habit streaks on.
 *
 * An unknown zone makes Intl throw RangeError. Profile.timezone is only
 * validated as a non-empty string during onboarding, so a bad value is
 * reachable; falling back to UTC keeps the app answering instead of erroring
 * out of every habit screen.
 */
export function todayIn(timezone: string): CalendarDay {
  return dayInZone(new Date(), timezone);
}

export function dayInZone(instant: Date, timezone: string): CalendarDay {
  const parts = zonedParts(instant, timezone) ?? zonedParts(instant, "UTC");
  if (!parts) return dateToDay(instant);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function zonedParts(
  instant: Date,
  timezone: string,
): { year: string; month: string; day: string } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * The UTC instant at which `day` ends in `timezone` — exclusive upper bound.
 *
 * Needed by anything that asks "had this happened by the end of that day?" of a
 * column storing a real instant rather than a CalendarDay: Task.completedAt and
 * Goal.completedAt are timestamps, so reconstructing a past day from them means
 * knowing where that day actually ended for this user. Using UTC midnight
 * instead would misfile every completion in the last three hours of the evening
 * for a Moscow user, which is precisely when people tick things off.
 *
 * Two passes rather than one: the offset has to be sampled at an instant, and
 * the instant is what we are solving for. The first pass guesses using the
 * offset at the wall-clock time, the second corrects it — enough for every real
 * zone including DST changeovers, where the two passes straddle the transition.
 *
 * An unknown zone falls back to UTC midnight, the same policy as dayInZone: a
 * bad Profile.timezone must not take a screen down.
 */
export function endOfDayInZone(day: CalendarDay, timezone: string): Date {
  const wallClock = dayToDate(addDays(day, 1)).getTime();

  const first = zoneOffsetMs(new Date(wallClock), timezone);
  if (first === null) return new Date(wallClock);

  const second = zoneOffsetMs(new Date(wallClock - first), timezone);
  return new Date(wallClock - (second ?? first));
}

/** How far ahead of UTC `timezone` is at `instant`, in ms. Null if unknown. */
function zoneOffsetMs(instant: Date, timezone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(instant);

    const read = (type: string): number => {
      const value = parts.find((part) => part.type === type)?.value;
      return value === undefined ? Number.NaN : Number(value);
    };

    // Some ICU builds render midnight as hour 24 under hour12: false.
    const asUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour") % 24,
      read("minute"),
      read("second"),
    );

    return Number.isNaN(asUtc) ? null : asUtc - instant.getTime();
  } catch {
    return null;
  }
}

/** The local hour 0–23 in `timezone` right now. Falls back to UTC. */
export function hourIn(timezone: string): number {
  const offset = zoneOffsetMs(new Date(), timezone) ?? 0;
  return new Date(Date.now() + offset).getUTCHours();
}

export function addDays(day: CalendarDay, amount: number): CalendarDay {
  return dateToDay(new Date(dayToDate(day).getTime() + amount * MS_PER_DAY));
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: CalendarDay, to: CalendarDay): number {
  return Math.round((dayToDate(to).getTime() - dayToDate(from).getTime()) / MS_PER_DAY);
}

/** 0 = Monday … 6 = Sunday — the order WEEKDAY_SHORT and the bitmask both use. */
export function weekdayIndex(day: CalendarDay): number {
  return (dayToDate(day).getUTCDay() + 6) % 7;
}

/** The Monday of the week containing `day`. */
export function startOfWeek(day: CalendarDay): CalendarDay {
  return addDays(day, -weekdayIndex(day));
}

/** Inclusive range, ascending. Returns [] when `to` precedes `from`. */
export function daysBetween(from: CalendarDay, to: CalendarDay): CalendarDay[] {
  const span = diffDays(from, to);
  if (span < 0) return [];
  return Array.from({ length: span + 1 }, (_, index) => addDays(from, index));
}

export function minDay(a: CalendarDay, b: CalendarDay): CalendarDay {
  return a <= b ? a : b;
}

export function maxDay(a: CalendarDay, b: CalendarDay): CalendarDay {
  return a >= b ? a : b;
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const dayMonth = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const dayMonthYear = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "15 августа", or "15 августа 2027 г." once the year stops being obvious. */
export function formatDay(day: CalendarDay, today: CalendarDay): string {
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return (sameYear ? dayMonth : dayMonthYear).format(dayToDate(day));
}

/** "Июль 2026" — the heading over a month grid. */
export function formatMonth(day: CalendarDay): string {
  const [year, month] = day.split("-").map(Number);
  return `${MONTH_NOMINATIVE[month - 1]} ${year}`;
}

/** The 1st of the month containing `day`. */
export function startOfMonth(day: CalendarDay): CalendarDay {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: CalendarDay): CalendarDay {
  const [year, month] = day.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  return dateToDay(new Date(Date.UTC(year, month, 0)));
}

export function addMonths(day: CalendarDay, amount: number): CalendarDay {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1));
  const lastDay = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return dateToDay(
    new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), Math.min(date, lastDay))),
  );
}
