import "server-only";
import { db } from "@/server/db";
import {
  addDays,
  dateToDay,
  dayInZone,
  dayToDate,
  diffDays,
  maxDay,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { expectedInRange } from "@/features/habits/lib/schedule";
import type { HabitItem, HabitSchedule } from "@/features/habits/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate
 * "does this belong to you?" check a future caller could forget. Logs are
 * reached through their parent habit's owner (`habit: { userId }`), the same
 * relation-filter trick GoalStep uses.
 *
 * The mutations use updateMany/deleteMany on purpose: Prisma's single-row
 * update needs a unique where, and { id, userId } is not a declared unique
 * pair; the *Many variants accept the compound filter and report 0 affected
 * rows for an id that exists but belongs to somebody else, which is exactly
 * the answer the action needs.
 */

/**
 * How much history travels to the client.
 *
 * A year is long enough for the calendar to be worth navigating and for a
 * streak claim to be meaningful, and short enough that a habit kept daily for
 * five years still ships one bounded array. Stats measured over it are labelled
 * "за год" rather than passed off as all-time.
 */
export const LOG_WINDOW_DAYS = 365;

/** The three columns that together encode a HabitSchedule. */
interface ScheduleColumns {
  frequency: string;
  weekdayMask: number;
  timesPerWeek: number;
}

/**
 * Flat columns back into the discriminated union the client uses.
 *
 * An unrecognised `frequency` falls back to daily rather than throwing: the
 * column is a plain string (SQLite has no enums), so a value written by a
 * future version or a manual edit must degrade to a habit that still renders,
 * not to a screen that refuses to load.
 */
function toSchedule(columns: ScheduleColumns): HabitSchedule {
  switch (columns.frequency) {
    case "weekdays":
      return { kind: "weekdays", weekdayMask: columns.weekdayMask };
    case "weekly":
      return { kind: "weekly", timesPerWeek: columns.timesPerWeek };
    default:
      return { kind: "daily" };
  }
}

/**
 * The union back into the three columns a write needs.
 *
 * The fields a given kind does not use are written to their neutral values
 * rather than left alone: an edit from "3 раза в неделю" to "по будням" must
 * not leave a stale timesPerWeek behind for the next reader to trip over.
 */
function fromSchedule(schedule: HabitSchedule): ScheduleColumns {
  switch (schedule.kind) {
    case "daily":
      return { frequency: "daily", weekdayMask: 127, timesPerWeek: 7 };
    case "weekdays":
      return { frequency: "weekdays", weekdayMask: schedule.weekdayMask, timesPerWeek: 7 };
    case "weekly":
      return { frequency: "weekly", weekdayMask: 127, timesPerWeek: schedule.timesPerWeek };
  }
}

type HabitRow = ScheduleColumns & {
  id: string;
  title: string;
  note: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  logs: { date: Date }[];
};

function toHabitItem(habit: HabitRow, timezone: string): HabitItem {
  return {
    id: habit.id,
    title: habit.title,
    note: habit.note,
    schedule: toSchedule(habit),
    createdAt: habit.createdAt.toISOString(),
    createdDay: dayInZone(habit.createdAt, timezone),
    archivedAt: habit.archivedAt?.toISOString() ?? null,
    // Stored at UTC midnight, so reading the UTC components back gives the
    // calendar day that was written — no zone conversion on the way out.
    log: habit.logs.map((entry) => dateToDay(entry.date)),
  };
}

export async function listHabits(
  userId: string,
  timezone: string,
  windowStart: CalendarDay,
): Promise<HabitItem[]> {
  const habits = await db.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      logs: {
        where: { date: { gte: dayToDate(windowStart) } },
        orderBy: { date: "asc" },
        select: { date: true },
      },
    },
  });

  return habits.map((habit) => toHabitItem(habit, timezone));
}

export interface HabitWriteData {
  title: string;
  note: string | null;
  schedule: HabitSchedule;
}

export async function createHabit(userId: string, data: HabitWriteData) {
  return db.habit.create({
    data: {
      userId,
      title: data.title,
      note: data.note,
      ...fromSchedule(data.schedule),
    },
  });
}

export async function updateHabit(
  userId: string,
  habitId: string,
  data: HabitWriteData,
): Promise<boolean> {
  const { count } = await db.habit.updateMany({
    where: { id: habitId, userId },
    data: {
      title: data.title,
      note: data.note,
      ...fromSchedule(data.schedule),
    },
  });
  return count > 0;
}

export async function setHabitArchived(
  userId: string,
  habitId: string,
  isArchived: boolean,
): Promise<boolean> {
  const { count } = await db.habit.updateMany({
    where: { id: habitId, userId },
    data: { archivedAt: isArchived ? new Date() : null },
  });
  return count > 0;
}

export async function deleteHabit(userId: string, habitId: string): Promise<boolean> {
  // Logs go with it via onDelete: Cascade on HabitLog.habitId.
  const { count } = await db.habit.deleteMany({ where: { id: habitId, userId } });
  return count > 0;
}

/**
 * Tick or un-tick one day.
 *
 * Ownership is checked first because the write itself cannot check it: the
 * create path has no habit-scoped filter to fold a userId into, so a plain
 * create with an attacker-supplied habitId would happily attach a log to
 * somebody else's habit.
 *
 * The create is an upsert against the (habitId, date) unique, so a double-tap
 * or a retried request settles on one row instead of failing on the second
 * attempt.
 */
export async function setHabitLog(
  userId: string,
  habitId: string,
  day: CalendarDay,
  isDone: boolean,
): Promise<boolean> {
  const habit = await db.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });
  if (!habit) return false;

  const date = dayToDate(day);

  if (isDone) {
    await db.habitLog.upsert({
      where: { habitId_date: { habitId, date } },
      create: { habitId, date },
      update: {},
    });
  } else {
    await db.habitLog.deleteMany({ where: { habitId, date } });
  }

  return true;
}

// ---------------------------------------------------------------------------
// Aggregates for the Dashboard
// ---------------------------------------------------------------------------

export interface HabitAdherence {
  /** Habits currently being tracked — archived ones are not owed anything. */
  activeCount: number;
  /** Ticks the schedules asked for over the trailing window. */
  expected: number;
  /** Ticks actually made in that window. */
  done: number;
}

/**
 * Adherence over the trailing `days`, for the Life Score.
 *
 * Computed here rather than by shipping every habit's history to the scoring
 * function: the "done" side is a single COUNT, and the "expected" side needs
 * only each habit's schedule columns, which are a handful of small rows.
 *
 * Each habit's window is clipped to its own creation day, so a habit added
 * yesterday is asked for one day's worth rather than a month's — otherwise
 * creating a habit would *lower* the score, which is exactly backwards.
 *
 * Archived habits are excluded from both sides. They owe nothing, and the days
 * they were kept before archiving are not evidence about this week.
 */
export async function getHabitAdherence(
  userId: string,
  timezone: string,
  today: CalendarDay,
  days: number,
): Promise<HabitAdherence> {
  const windowFrom = addDays(today, -(days - 1));

  const habits = await db.habit.findMany({
    where: { userId, archivedAt: null },
    select: {
      frequency: true,
      weekdayMask: true,
      timesPerWeek: true,
      createdAt: true,
    },
  });

  if (habits.length === 0) return { activeCount: 0, expected: 0, done: 0 };

  const expected = habits.reduce((total, habit) => {
    const from = maxDay(windowFrom, dayInZone(habit.createdAt, timezone));
    if (diffDays(from, today) < 0) return total;
    return total + expectedInRange(toSchedule(habit), from, today);
  }, 0);

  const done = await db.habitLog.count({
    where: {
      habit: { userId, archivedAt: null },
      date: { gte: dayToDate(windowFrom), lte: dayToDate(today) },
    },
  });

  return { activeCount: habits.length, expected, done };
}

/** Active habits only — what the Dashboard's counters should reflect. */
export async function countActiveHabits(userId: string): Promise<number> {
  return db.habit.count({ where: { userId, archivedAt: null } });
}
