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
import { expectedInRange } from "@/features/appearance/lib/schedule";
import { completedDays } from "@/features/appearance/lib/stats";
import { CARE_AREAS, CARE_TIMES } from "@/features/appearance/schemas";
import type {
  CareArea,
  CareGoalItem,
  CarePhotoItem,
  CareRoutineItem,
  CareSchedule,
  CareTime,
} from "@/features/appearance/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate "does
 * this belong to you?" check a future caller could forget. Step-level writes
 * reach their owner through two relations (`step: { routine: { userId } }`),
 * the same relation-filter trick HabitLog uses through its habit.
 *
 * The mutations use updateMany/deleteMany on purpose: Prisma's single-row
 * update needs a unique where, and { id, userId } is not a declared unique
 * pair; the *Many variants accept the compound filter and report 0 affected
 * rows for an id that exists but belongs to somebody else, which is exactly
 * the answer the action needs. Same conventions as habits.repository.ts and
 * nutrition.repository.ts.
 */

/**
 * How much log history travels to the client.
 *
 * Half a year: long enough for the month calendar to be worth paging through
 * and for a streak claim to mean something, short enough that a user with six
 * routines of four steps each still ships a bounded array — this section's logs
 * are per *step*, so the same window that is comfortable for habits would be
 * several times the payload here.
 */
export const LOG_WINDOW_DAYS = 180;

/**
 * How far back progress photos are loaded.
 *
 * Longer than the log window on purpose, and it costs less than it looks:
 * photos travel as thumbnails only (see CarePhotoItem), and a before/after
 * comparison is worth much more at a year than at six months — that is the
 * whole point of taking them.
 */
export const PHOTO_WINDOW_DAYS = 365;

/** The trailing window appearance care is judged over, for the Life Score. */
export const APPEARANCE_SCORING_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// Column <-> union mapping
// ---------------------------------------------------------------------------

interface ScheduleColumns {
  frequency: string;
  weekdayMask: number;
  timesPerWeek: number;
}

/**
 * Flat columns back into the discriminated union the client uses.
 *
 * An unrecognised value falls back rather than throwing: these are plain string
 * columns (SQLite has no enums), so a value written by a future version or a
 * manual edit must degrade to a row that still renders, not to a screen that
 * refuses to load. Same policy as habits.repository.ts.
 */
function toSchedule(columns: ScheduleColumns): CareSchedule {
  switch (columns.frequency) {
    case "weekdays":
      return { kind: "weekdays", weekdayMask: columns.weekdayMask };
    case "weekly":
      return { kind: "weekly", timesPerWeek: columns.timesPerWeek };
    default:
      return { kind: "daily" };
  }
}

function fromSchedule(schedule: CareSchedule): ScheduleColumns {
  switch (schedule.kind) {
    case "daily":
      return { frequency: "daily", weekdayMask: 127, timesPerWeek: 7 };
    case "weekdays":
      return { frequency: "weekdays", weekdayMask: schedule.weekdayMask, timesPerWeek: 7 };
    case "weekly":
      return { frequency: "weekly", weekdayMask: 127, timesPerWeek: schedule.timesPerWeek };
  }
}

function toArea(value: string): CareArea {
  return (CARE_AREAS as readonly string[]).includes(value) ? (value as CareArea) : "custom";
}

function toTime(value: string): CareTime {
  return (CARE_TIMES as readonly string[]).includes(value) ? (value as CareTime) : "any";
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

interface RoutineRow extends ScheduleColumns {
  id: string;
  title: string;
  note: string | null;
  category: string;
  timeOfDay: string;
  archivedAt: Date | null;
  createdAt: Date;
  steps: {
    id: string;
    title: string;
    position: number;
    createdAt: Date;
    logs: { day: Date }[];
  }[];
  logs: { day: Date }[];
}

function toRoutineItem(routine: RoutineRow, timezone: string): CareRoutineItem {
  return {
    id: routine.id,
    title: routine.title,
    note: routine.note,
    area: toArea(routine.category),
    timeOfDay: toTime(routine.timeOfDay),
    schedule: toSchedule(routine),
    createdAt: routine.createdAt.toISOString(),
    createdDay: dayInZone(routine.createdAt, timezone),
    archivedAt: routine.archivedAt?.toISOString() ?? null,
    steps: routine.steps.map((step) => ({
      id: step.id,
      title: step.title,
      position: step.position,
      createdDay: dayInZone(step.createdAt, timezone),
      // Stored at UTC midnight, so reading the UTC components back gives the
      // calendar day that was written — no zone conversion on the way out.
      log: step.logs.map((entry) => dateToDay(entry.day)),
    })),
    log: routine.logs.map((entry) => dateToDay(entry.day)),
  };
}

export async function listRoutines(
  userId: string,
  timezone: string,
  windowStart: CalendarDay,
): Promise<CareRoutineItem[]> {
  const since = { day: { gte: dayToDate(windowStart) } };

  const routines = await db.appearanceRoutine.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      steps: {
        orderBy: { position: "asc" },
        include: { logs: { where: since, orderBy: { day: "asc" }, select: { day: true } } },
      },
      logs: { where: since, orderBy: { day: "asc" }, select: { day: true } },
    },
  });

  return routines.map((routine) => toRoutineItem(routine, timezone));
}

export interface RoutineWriteData {
  title: string;
  note: string | null;
  area: CareArea;
  timeOfDay: CareTime;
  schedule: CareSchedule;
  steps: { id?: string; title: string }[];
}

export async function createRoutine(userId: string, data: RoutineWriteData) {
  return db.appearanceRoutine.create({
    data: {
      userId,
      title: data.title,
      note: data.note,
      category: data.area,
      timeOfDay: data.timeOfDay,
      ...fromSchedule(data.schedule),
      steps: {
        create: data.steps.map((step, index) => ({ title: step.title, position: index })),
      },
    },
  });
}

/**
 * Edit a routine, keeping the history of the steps that survive.
 *
 * Deliberately *not* the delete-and-recreate a nutrition meal template gets.
 * A step's ticks are real days that happened, and completion is derived from
 * them — recreating "тоник" under a new id on every edit would silently erase
 * every past day the routine was finished. So a step arriving with an id is
 * updated in place, one without an id is created, and one that is no longer in
 * the list is deleted along with its logs.
 *
 * A newly created step carries today's createdAt, which is exactly what stops
 * it from reaching back and marking finished days incomplete — see
 * activeStepsOn in lib/stats.ts.
 */
export async function updateRoutine(
  userId: string,
  routineId: string,
  data: RoutineWriteData,
): Promise<boolean> {
  const existing = await db.appearanceRoutine.findFirst({
    where: { id: routineId, userId },
    select: { id: true, steps: { select: { id: true } } },
  });
  if (!existing) return false;

  const knownIds = new Set(existing.steps.map((step) => step.id));
  // A forged id that is not one of this routine's own steps is treated as a
  // new step rather than trusted — it must never address another routine's row.
  const kept = data.steps.filter((step) => step.id !== undefined && knownIds.has(step.id));
  const keptIds = new Set(kept.map((step) => step.id));
  const removed = [...knownIds].filter((id) => !keptIds.has(id));

  await db.$transaction([
    db.appearanceRoutine.update({
      where: { id: routineId },
      data: {
        title: data.title,
        note: data.note,
        category: data.area,
        timeOfDay: data.timeOfDay,
        ...fromSchedule(data.schedule),
      },
    }),
    ...(removed.length > 0
      ? [db.appearanceStep.deleteMany({ where: { id: { in: removed }, routineId } })]
      : []),
    ...data.steps.map((step, index) =>
      step.id !== undefined && knownIds.has(step.id)
        ? db.appearanceStep.update({
            where: { id: step.id },
            data: { title: step.title, position: index },
          })
        : db.appearanceStep.create({
            data: { routineId, title: step.title, position: index },
          }),
    ),
  ]);

  return true;
}

export async function setRoutineArchived(
  userId: string,
  routineId: string,
  isArchived: boolean,
): Promise<boolean> {
  const { count } = await db.appearanceRoutine.updateMany({
    where: { id: routineId, userId },
    data: { archivedAt: isArchived ? new Date() : null },
  });
  return count > 0;
}

export async function deleteRoutine(userId: string, routineId: string): Promise<boolean> {
  // Steps and every log under them go with it via onDelete: Cascade.
  const { count } = await db.appearanceRoutine.deleteMany({ where: { id: routineId, userId } });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Ticking
// ---------------------------------------------------------------------------

/**
 * Mark a whole routine done, or undo it.
 *
 * One action for both shapes of routine, because "готово" means the same thing
 * to the user either way: a routine with a checklist has all of its steps
 * ticked (and un-ticked), a routine without one gets its own log row. Which
 * table is written is decided here rather than by the caller, so the completion
 * rule in lib/stats.ts and the write that satisfies it stay in agreement.
 *
 * Only steps that already existed on that day are touched — a step added today
 * is not retroactively ticked for last Tuesday, which would be a claim about
 * something that never happened.
 *
 * Everything runs in one transaction, so a routine is never left half-ticked,
 * and every create is an upsert against the compound unique, so a double-tap
 * settles on one row instead of failing on the second attempt.
 */
export async function setRoutineDone(
  userId: string,
  routineId: string,
  day: CalendarDay,
  isDone: boolean,
  timezone: string,
): Promise<boolean> {
  const routine = await db.appearanceRoutine.findFirst({
    where: { id: routineId, userId },
    select: { id: true, steps: { select: { id: true, createdAt: true } } },
  });
  if (!routine) return false;

  const date = dayToDate(day);
  const steps = routine.steps.filter(
    (step) => diffDays(dayInZone(step.createdAt, timezone), day) >= 0,
  );

  if (steps.length === 0) {
    if (isDone) {
      await db.appearanceRoutineLog.upsert({
        where: { routineId_day: { routineId, day: date } },
        create: { routineId, day: date },
        update: {},
      });
    } else {
      await db.appearanceRoutineLog.deleteMany({ where: { routineId, day: date } });
    }
    return true;
  }

  if (isDone) {
    await db.$transaction(
      steps.map((step) =>
        db.appearanceStepLog.upsert({
          where: { stepId_day: { stepId: step.id, day: date } },
          create: { stepId: step.id, day: date },
          update: {},
        }),
      ),
    );
  } else {
    await db.appearanceStepLog.deleteMany({
      where: { stepId: { in: steps.map((step) => step.id) }, day: date },
    });
  }

  return true;
}

/**
 * Tick or un-tick one checklist item.
 *
 * Ownership is checked first because the write itself cannot check it: the
 * create path has no user-scoped filter to fold a userId into, so a plain
 * create with an attacker-supplied stepId would attach a log to somebody else's
 * routine.
 */
export async function setStepDone(
  userId: string,
  stepId: string,
  day: CalendarDay,
  isDone: boolean,
): Promise<boolean> {
  const step = await db.appearanceStep.findFirst({
    where: { id: stepId, routine: { userId } },
    select: { id: true },
  });
  if (!step) return false;

  const date = dayToDate(day);

  if (isDone) {
    await db.appearanceStepLog.upsert({
      where: { stepId_day: { stepId, day: date } },
      create: { stepId, day: date },
      update: {},
    });
  } else {
    await db.appearanceStepLog.deleteMany({ where: { stepId, day: date } });
  }

  return true;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/**
 * Photo metadata and thumbnails — never the full images.
 *
 * The `select` here is the whole reason the section loads at all: including
 * `imageData` would put a megabyte per photo into a snapshot the screen fetches
 * on every visit. Full bytes come one at a time through getPhotoImage.
 */
export async function listPhotos(
  userId: string,
  windowStart: CalendarDay,
): Promise<CarePhotoItem[]> {
  const photos = await db.appearancePhoto.findMany({
    where: { userId, day: { gte: dayToDate(windowStart) } },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      category: true,
      day: true,
      note: true,
      thumbData: true,
      width: true,
      height: true,
      createdAt: true,
    },
  });

  return photos.map((photo) => ({
    id: photo.id,
    area: toArea(photo.category),
    day: dateToDay(photo.day),
    note: photo.note,
    thumbData: photo.thumbData,
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt.toISOString(),
  }));
}

export async function getPhotoImage(userId: string, photoId: string): Promise<string | null> {
  const photo = await db.appearancePhoto.findFirst({
    where: { id: photoId, userId },
    select: { imageData: true },
  });
  return photo?.imageData ?? null;
}

export interface PhotoWriteData {
  area: CareArea;
  day: CalendarDay;
  note: string | null;
  imageData: string;
  thumbData: string;
  width: number;
  height: number;
}

export async function createPhoto(userId: string, data: PhotoWriteData) {
  return db.appearancePhoto.create({
    data: {
      userId,
      category: data.area,
      day: dayToDate(data.day),
      note: data.note,
      imageData: data.imageData,
      thumbData: data.thumbData,
      width: data.width,
      height: data.height,
    },
  });
}

/** Only the caption and the area — the bytes of a taken photo are not editable. */
export async function updatePhotoMeta(
  userId: string,
  photoId: string,
  data: { area: CareArea; note: string | null },
): Promise<boolean> {
  const { count } = await db.appearancePhoto.updateMany({
    where: { id: photoId, userId },
    data: { category: data.area, note: data.note },
  });
  return count > 0;
}

export async function deletePhoto(userId: string, photoId: string): Promise<boolean> {
  const { count } = await db.appearancePhoto.deleteMany({ where: { id: photoId, userId } });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function listCareGoals(
  userId: string,
  timezone: string,
): Promise<CareGoalItem[]> {
  const goals = await db.appearanceGoal.findMany({
    where: { userId },
    orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
  });

  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    note: goal.note,
    area: toArea(goal.category),
    targetDate: goal.targetDate ? dateToDay(goal.targetDate) : null,
    isCompleted: goal.isCompleted,
    completedAt: goal.completedAt?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    createdDay: dayInZone(goal.createdAt, timezone),
  }));
}

export interface CareGoalWriteData {
  title: string;
  note: string | null;
  area: CareArea;
  targetDate: CalendarDay | null;
}

export async function createCareGoal(userId: string, data: CareGoalWriteData) {
  return db.appearanceGoal.create({
    data: {
      userId,
      title: data.title,
      note: data.note,
      category: data.area,
      targetDate: data.targetDate ? dayToDate(data.targetDate) : null,
    },
  });
}

export async function updateCareGoal(
  userId: string,
  goalId: string,
  data: CareGoalWriteData,
): Promise<boolean> {
  const { count } = await db.appearanceGoal.updateMany({
    where: { id: goalId, userId },
    data: {
      title: data.title,
      note: data.note,
      category: data.area,
      targetDate: data.targetDate ? dayToDate(data.targetDate) : null,
    },
  });
  return count > 0;
}

/**
 * Close a goal, or reopen it.
 *
 * completedAt is cleared on reopen rather than left behind: it is what the
 * history timeline dates the achievement by, and a stale instant would put a
 * "цель достигнута" entry on the timeline for a goal that is open again.
 */
export async function setCareGoalCompleted(
  userId: string,
  goalId: string,
  isCompleted: boolean,
): Promise<boolean> {
  const { count } = await db.appearanceGoal.updateMany({
    where: { id: goalId, userId },
    data: { isCompleted, completedAt: isCompleted ? new Date() : null },
  });
  return count > 0;
}

export async function deleteCareGoal(userId: string, goalId: string): Promise<boolean> {
  const { count } = await db.appearanceGoal.deleteMany({ where: { id: goalId, userId } });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Aggregates for the Life Score and the Coach
// ---------------------------------------------------------------------------

export interface AppearanceAdherence {
  /** Routines currently tracked. Archived ones owe nothing and are excluded. */
  activeCount: number;
  /** Completions the schedules asked for, clipped to each creation day. */
  expected: number;
  /** Completions that actually happened. */
  done: number;
}

/**
 * Adherence over the trailing `days`, for the Life Score.
 *
 * Unlike getHabitAdherence, the "done" side cannot be a COUNT: a routine with a
 * checklist is done only when *every* step that existed by then is ticked, and
 * that rule lives in lib/stats.ts. So this loads the routines through the same
 * function the screen uses and applies the same derivation, which is what
 * guarantees the number the Life Score scores is the number the user sees.
 * The window is a week, so this is a handful of small rows, not a scan.
 *
 * Each routine's window is clipped to its own creation day, so a routine added
 * yesterday is asked for one day's worth rather than a week's — otherwise
 * creating a routine would *lower* the score, which is exactly backwards.
 */
export async function getAppearanceAdherence(
  userId: string,
  timezone: string,
  today: CalendarDay,
  days: number,
): Promise<AppearanceAdherence> {
  const windowFrom = addDays(today, -(days - 1));
  const routines = await listRoutines(userId, timezone, windowFrom);
  const active = routines.filter((routine) => routine.archivedAt === null);

  if (active.length === 0) return { activeCount: 0, expected: 0, done: 0 };

  const expected = active.reduce((total, routine) => {
    const from = maxDay(windowFrom, routine.createdDay);
    if (diffDays(from, today) < 0) return total;
    return total + expectedInRange(routine.schedule, from, today);
  }, 0);

  const done = active.reduce(
    (total, routine) => total + completedDays(routine, windowFrom, today).length,
    0,
  );

  return { activeCount: active.length, expected, done };
}

/** Active routines only — what a Dashboard counter should reflect. */
export async function countActiveRoutines(userId: string): Promise<number> {
  return db.appearanceRoutine.count({ where: { userId, archivedAt: null } });
}
