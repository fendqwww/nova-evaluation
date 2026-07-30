import "server-only";
import { db } from "@/server/db";
import {
  addDays,
  dateToDay,
  dayToDate,
  endOfDayInZone,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { TASK_PRIORITIES } from "@/features/tasks/schemas";
import type { TaskItem, TaskPriority } from "@/features/tasks/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate
 * "does this belong to you?" check a future caller could forget.
 *
 * The mutations use updateMany/deleteMany on purpose: Prisma's single-row
 * update needs a unique where, and { id, userId } is not a declared unique
 * pair; the *Many variants accept the compound filter and report 0 affected
 * rows for an id that exists but belongs to somebody else, which is exactly
 * the answer the action needs.
 */

type TaskRow = {
  id: string;
  title: string;
  note: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  priority: string;
  createdAt: Date;
};

/**
 * An unrecognised priority falls back to normal rather than throwing: the
 * column is a plain string (SQLite has no enums), so a value written by a
 * future version or a manual edit must degrade to a task that still renders,
 * not to a screen that refuses to load.
 */
function toPriority(value: string): TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value)
    ? (value as TaskPriority)
    : "normal";
}

function toTaskItem(task: TaskRow): TaskItem {
  return {
    id: task.id,
    title: task.title,
    note: task.note,
    isCompleted: task.isCompleted,
    completedAt: task.completedAt?.toISOString() ?? null,
    // Stored at UTC midnight, so reading the UTC components back gives the
    // calendar day that was written — no zone conversion on the way out.
    dueDate: task.dueDate ? dateToDay(task.dueDate) : null,
    priority: toPriority(task.priority),
    createdAt: task.createdAt.toISOString(),
  };
}

export async function listTasks(userId: string): Promise<TaskItem[]> {
  const tasks = await db.task.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return tasks.map(toTaskItem);
}

export interface TaskWriteData {
  title: string;
  note: string | null;
  dueDate: CalendarDay | null;
  priority: TaskPriority;
}

function toColumns(data: TaskWriteData) {
  return {
    title: data.title,
    note: data.note,
    dueDate: data.dueDate ? dayToDate(data.dueDate) : null,
    priority: data.priority,
  };
}

export async function createTask(userId: string, data: TaskWriteData) {
  return db.task.create({ data: { userId, ...toColumns(data) } });
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: TaskWriteData,
): Promise<boolean> {
  const { count } = await db.task.updateMany({
    where: { id: taskId, userId },
    data: toColumns(data),
  });
  return count > 0;
}

/**
 * completedAt moves with isCompleted, always — the pair is the record of *when*
 * something was finished, and the Life Score reads it to score the last seven
 * days. Letting a re-opened task keep its old timestamp would leave it counted
 * as this week's work forever.
 */
export async function setTaskCompleted(
  userId: string,
  taskId: string,
  isCompleted: boolean,
): Promise<boolean> {
  const { count } = await db.task.updateMany({
    where: { id: taskId, userId },
    data: { isCompleted, completedAt: isCompleted ? new Date() : null },
  });
  return count > 0;
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const { count } = await db.task.deleteMany({ where: { id: taskId, userId } });
  return count > 0;
}

/** Clearing out finished work in one go, rather than one confirm at a time. */
export async function deleteCompletedTasks(userId: string): Promise<number> {
  const { count } = await db.task.deleteMany({ where: { userId, isCompleted: true } });
  return count;
}

// ---------------------------------------------------------------------------
// Aggregates for the Dashboard
// ---------------------------------------------------------------------------

export interface TaskThroughput {
  /** Tasks still open. */
  open: number;
  /** Finished within the trailing window. */
  completed: number;
  /** Open tasks whose due date has already passed. */
  overdue: number;
}

/**
 * Throughput over the trailing `days` ending on `day`, for the Life Score.
 *
 * Three counts rather than a full fetch: the score only needs volume, and
 * loading every task to compute it would make the Dashboard pay for the Tasks
 * screen's payload on every render.
 *
 * `day` is genuinely a parameter, not a synonym for today. Passing yesterday
 * reconstructs yesterday: a task is open *as of* a day if it existed by the end
 * of that day and had not been closed by then, which createdAt and completedAt
 * together can answer exactly. That is what lets the AI Coach report a real
 * day-over-day change instead of storing a nightly snapshot — a snapshot would
 * be a second source of truth, and would simply be missing for every day the
 * user did not open the app.
 *
 * The day's end comes from the user's timezone, not from UTC midnight: someone
 * in Moscow finishing a task at 22:30 local did it *that* day, and a UTC
 * boundary would file it under the next one.
 */
export async function getTaskThroughput(
  userId: string,
  day: CalendarDay,
  days: number,
  timezone: string,
): Promise<TaskThroughput> {
  const from = dayToDate(addDays(day, -(days - 1)));
  const end = endOfDayInZone(day, timezone);

  // "Not closed by the end of that day" — either still open now, or closed
  // later than the day being asked about.
  const stillOpenThen = {
    OR: [{ isCompleted: false }, { completedAt: { gt: end } }],
  };

  const [open, completed, overdue] = await Promise.all([
    db.task.count({
      where: { userId, createdAt: { lte: end }, ...stillOpenThen },
    }),
    db.task.count({
      where: { userId, completedAt: { gte: from, lte: end } },
    }),
    db.task.count({
      where: {
        userId,
        createdAt: { lte: end },
        dueDate: { lt: dayToDate(day) },
        ...stillOpenThen,
      },
    }),
  ]);

  return { open, completed, overdue };
}
