import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * How often a habit is meant to be kept.
 *
 * A discriminated union rather than the three flat columns it maps to
 * (Habit.frequency / weekdayMask / timesPerWeek): the columns exist because
 * SQLite has no enums or scalar lists, but nothing downstream should have to
 * remember that `timesPerWeek` is meaningless on a daily habit. The repository
 * is the single place the two shapes meet.
 *
 * - daily     — every day, no exceptions.
 * - weekdays  — specific days of the week. Missing an unscheduled day is not
 *               a miss, which is what separates "по будням" from "каждый день".
 * - weekly    — N days a week, the user picks which. Measured per week, so a
 *               streak here counts weeks rather than days.
 */
export type HabitSchedule =
  | { kind: "daily" }
  | { kind: "weekdays"; weekdayMask: number }
  | { kind: "weekly"; timesPerWeek: number };

export type HabitScheduleKind = HabitSchedule["kind"];

/**
 * A habit as the client sees it.
 *
 * `log` is the raw history — the days this habit was kept — and every number
 * the UI shows (streak, adherence, this week's progress) is computed from it
 * at render time by lib/stats.ts. Nothing derived is sent from the server and
 * nothing derived is stored, for the same reason GoalItem has no `progress`
 * field: a cached streak is wrong the instant a day is un-ticked.
 *
 * Sending the history instead of the summary is also what lets ticking a day
 * be optimistic. The cache gains one string, and the streak, the ring and the
 * calendar all move on the same frame — a server-computed streak would sit
 * there stale until the refetch landed.
 */
export interface HabitItem {
  id: string;
  title: string;
  note: string | null;
  schedule: HabitSchedule;
  /** ISO instant — used for stable ordering, not for day arithmetic. */
  createdAt: string;
  /**
   * The calendar day the habit was created, resolved in the user's timezone
   * server-side. Not derivable from `createdAt` on the client, which has no
   * authoritative zone — and stats need it, because a habit created yesterday
   * must not be scored for the whole month before it existed.
   */
  createdDay: CalendarDay;
  /** ISO instant, or null while the habit is active. */
  archivedAt: string | null;
  /**
   * Days kept, ascending, inside the loaded window only. Never assume this
   * reaches back to createdAt — see HabitsSnapshot.windowStart.
   */
  log: CalendarDay[];
}

/**
 * One fetch of the Habits screen.
 *
 * `today` is resolved from the user's profile timezone server-side, so every
 * client calculation agrees with the server about which day is being ticked
 * even when the device clock does not.
 *
 * `windowStart` is the horizon of the log: history is loaded for a bounded
 * window rather than all of it, so a habit kept for three years does not ship
 * a thousand strings on every render. Stats measured over the window say so in
 * the UI ("за год") instead of quietly reporting a truncated number as
 * all-time.
 */
export interface HabitsSnapshot {
  today: CalendarDay;
  windowStart: CalendarDay;
  habits: HabitItem[];
}
