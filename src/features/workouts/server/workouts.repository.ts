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
import { expectedSessions } from "@/features/workouts/lib/stats";
import { isWorkoutCategory } from "@/features/workouts/lib/categories";
import type {
  WorkoutCategory,
  WorkoutExerciseItem,
  WorkoutItem,
  WorkoutSessionItem,
} from "@/features/workouts/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate "does
 * this belong to you?" check a future caller could forget. Exercises, sessions
 * and sets are reached through their parent workout's owner
 * (`workout: { userId }`), the same relation-filter trick HabitLog uses.
 *
 * The mutations use updateMany/deleteMany on purpose: Prisma's single-row
 * update needs a unique where, and { id, userId } is not a declared unique
 * pair; the *Many variants accept the compound filter and report 0 affected
 * rows for an id that exists but belongs to somebody else, which is exactly the
 * answer the action needs.
 */

/**
 * How much history travels to the client.
 *
 * Half a year is long enough for a progress line on a lift to mean something
 * and for the calendar to be worth navigating, and short enough that someone
 * training four times a week for five years still ships one bounded array.
 * Shorter than the habits window on purpose: a habit day is one string, a
 * training day is a couple of dozen set objects.
 */
export const SESSION_WINDOW_DAYS = 180;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

interface ExerciseRow {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  restSeconds: number;
  note: string | null;
  position: number;
  archivedAt: Date | null;
}

interface WorkoutRow {
  id: string;
  title: string;
  note: string | null;
  category: string;
  weekdayMask: number;
  archivedAt: Date | null;
  createdAt: Date;
  exercises: ExerciseRow[];
}

function toExerciseItem(exercise: ExerciseRow): WorkoutExerciseItem {
  return {
    id: exercise.id,
    name: exercise.name,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
    targetWeightKg: exercise.targetWeightKg,
    restSeconds: exercise.restSeconds,
    note: exercise.note,
    position: exercise.position,
    archivedAt: exercise.archivedAt?.toISOString() ?? null,
  };
}

/**
 * An unrecognised category degrades to "other" rather than throwing, the same
 * policy toPriority uses for tasks: the column is a plain string, so a value
 * from a future version must still render a workout.
 */
function toCategory(value: string): WorkoutCategory {
  return isWorkoutCategory(value) ? value : "other";
}

function toWorkoutItem(workout: WorkoutRow, timezone: string): WorkoutItem {
  return {
    id: workout.id,
    title: workout.title,
    note: workout.note,
    category: toCategory(workout.category),
    weekdayMask: workout.weekdayMask,
    createdAt: workout.createdAt.toISOString(),
    createdDay: dayInZone(workout.createdAt, timezone),
    archivedAt: workout.archivedAt?.toISOString() ?? null,
    exercises: workout.exercises.map(toExerciseItem),
  };
}

const EXERCISE_SELECT = {
  id: true,
  name: true,
  targetSets: true,
  targetReps: true,
  targetWeightKg: true,
  restSeconds: true,
  note: true,
  position: true,
  archivedAt: true,
} as const;

export async function listWorkouts(
  userId: string,
  timezone: string,
): Promise<WorkoutItem[]> {
  const workouts = await db.workout.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      exercises: {
        // Archived exercises sort last so the plan reads in its own order and
        // the leftovers that only anchor history sit underneath it.
        orderBy: [{ archivedAt: "asc" }, { position: "asc" }],
        select: EXERCISE_SELECT,
      },
    },
  });

  return workouts.map((workout) => toWorkoutItem(workout, timezone));
}

export async function listSessions(
  userId: string,
  windowStart: CalendarDay,
): Promise<WorkoutSessionItem[]> {
  const sessions = await db.workoutSession.findMany({
    where: { workout: { userId }, day: { gte: dayToDate(windowStart) } },
    orderBy: { day: "asc" },
    include: {
      sets: {
        orderBy: [{ exerciseId: "asc" }, { position: "asc" }],
        select: { exerciseId: true, position: true, reps: true, weightKg: true },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    workoutId: session.workoutId,
    // Stored at UTC midnight, so reading the UTC components back gives the
    // calendar day that was written — no zone conversion on the way out.
    day: dateToDay(session.day),
    completedAt: session.completedAt?.toISOString() ?? null,
    note: session.note,
    sets: session.sets,
  }));
}

// ---------------------------------------------------------------------------
// Workout writes
// ---------------------------------------------------------------------------

export interface ExerciseWriteData {
  id?: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  restSeconds: number;
  note: string | null;
}

export interface WorkoutWriteData {
  title: string;
  note: string | null;
  category: WorkoutCategory;
  weekdayMask: number;
  exercises: ExerciseWriteData[];
}

export async function createWorkout(userId: string, data: WorkoutWriteData) {
  return db.workout.create({
    data: {
      userId,
      title: data.title,
      note: data.note,
      category: data.category,
      weekdayMask: data.weekdayMask,
      exercises: {
        create: data.exercises.map((exercise, index) => ({
          name: exercise.name,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeightKg: exercise.targetWeightKg,
          restSeconds: exercise.restSeconds,
          note: exercise.note,
          position: index,
        })),
      },
    },
  });
}

/**
 * Save an edited plan without losing what was already performed against it.
 *
 * The incoming list is diffed against the stored one rather than replacing it:
 * a delete-and-recreate would give every exercise a new id, and every set ever
 * logged points at the old one. So rows that came back with an id are updated,
 * rows without one are created, and rows that disappeared are *archived* if
 * they have sets behind them and only hard-deleted when they have none — a typo
 * leaves no ghost in the history, a real exercise leaves its record.
 *
 * The whole thing runs in one transaction: a plan that is half-saved is a plan
 * whose set positions no longer line up with its targets.
 */
export async function updateWorkout(
  userId: string,
  workoutId: string,
  data: WorkoutWriteData,
): Promise<boolean> {
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId },
    select: {
      id: true,
      exercises: {
        select: { id: true, archivedAt: true, _count: { select: { sets: true } } },
      },
    },
  });
  if (!workout) return false;

  const incomingIds = new Set(
    data.exercises.map((exercise) => exercise.id).filter((id): id is string => Boolean(id)),
  );

  // An id the client sent that this workout does not own is ignored rather than
  // trusted — otherwise a forged payload could reattach somebody else's
  // exercise to this plan.
  const ownedIds = new Set(workout.exercises.map((exercise) => exercise.id));

  const dropped = workout.exercises.filter(
    (exercise) => exercise.archivedAt === null && !incomingIds.has(exercise.id),
  );

  await db.$transaction(async (tx) => {
    await tx.workout.update({
      where: { id: workoutId },
      data: {
        title: data.title,
        note: data.note,
        category: data.category,
        weekdayMask: data.weekdayMask,
      },
    });

    for (const [index, exercise] of data.exercises.entries()) {
      const columns = {
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeightKg: exercise.targetWeightKg,
        restSeconds: exercise.restSeconds,
        note: exercise.note,
        position: index,
      };

      if (exercise.id && ownedIds.has(exercise.id)) {
        await tx.workoutExercise.update({
          where: { id: exercise.id },
          // Re-adding a previously archived exercise puts it back in the plan
          // with its history intact, which is the whole point of archiving it.
          data: { ...columns, archivedAt: null },
        });
      } else {
        await tx.workoutExercise.create({ data: { workoutId, ...columns } });
      }
    }

    for (const exercise of dropped) {
      if (exercise._count.sets > 0) {
        await tx.workoutExercise.update({
          where: { id: exercise.id },
          data: { archivedAt: new Date() },
        });
      } else {
        await tx.workoutExercise.delete({ where: { id: exercise.id } });
      }
    }
  });

  return true;
}

export async function setWorkoutArchived(
  userId: string,
  workoutId: string,
  isArchived: boolean,
): Promise<boolean> {
  const { count } = await db.workout.updateMany({
    where: { id: workoutId, userId },
    data: { archivedAt: isArchived ? new Date() : null },
  });
  return count > 0;
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<boolean> {
  // Exercises, sessions and sets all go with it via onDelete: Cascade.
  const { count } = await db.workout.deleteMany({ where: { id: workoutId, userId } });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * Ownership check for anything reached through a workout.
 *
 * The create paths have no workout-scoped filter to fold a userId into, so a
 * plain create with an attacker-supplied workoutId would happily attach a
 * session to somebody else's programme. Same reasoning as setHabitLog.
 */
async function ownsWorkout(userId: string, workoutId: string): Promise<boolean> {
  const workout = await db.workout.findFirst({
    where: { id: workoutId, userId },
    select: { id: true },
  });
  return workout !== null;
}

/**
 * Start a session for a day, or return the one that is already there.
 *
 * The upsert is against the (workoutId, day) unique, so a double-tap or a
 * retried request settles on one session instead of failing on the second
 * attempt — and re-entering a workout you started this morning continues it
 * rather than wiping the sets you already logged.
 */
export async function openSession(
  userId: string,
  workoutId: string,
  day: CalendarDay,
): Promise<string | null> {
  if (!(await ownsWorkout(userId, workoutId))) return null;

  const session = await db.workoutSession.upsert({
    where: { workoutId_day: { workoutId, day: dayToDate(day) } },
    create: { workoutId, day: dayToDate(day) },
    update: {},
    select: { id: true },
  });

  return session.id;
}

/**
 * Mark a day finished, or reopen it.
 *
 * Takes the target state rather than toggling server-side, like
 * setGoalCompletedAction: two quick taps then settle on the state the user
 * actually sees instead of racing to flip twice.
 *
 * Completing a day that has no session creates one — that is the "just tick it"
 * path from the card and the calendar, where a user records that they trained
 * without logging every set. A session with no sets is a real record, not an
 * empty one: it says the workout happened.
 */
export async function setSessionCompleted(
  userId: string,
  workoutId: string,
  day: CalendarDay,
  isCompleted: boolean,
): Promise<boolean> {
  if (!(await ownsWorkout(userId, workoutId))) return false;

  const date = dayToDate(day);

  await db.workoutSession.upsert({
    where: { workoutId_day: { workoutId, day: date } },
    create: { workoutId, day: date, completedAt: isCompleted ? new Date() : null },
    // completedAt moves with the flag, always — the Life Score reads it to
    // score the last seven days, and a reopened session that kept its old
    // timestamp would be counted as this week's work forever.
    update: { completedAt: isCompleted ? new Date() : null },
  });

  return true;
}

export async function setSessionNote(
  userId: string,
  sessionId: string,
  note: string | null,
): Promise<boolean> {
  const { count } = await db.workoutSession.updateMany({
    where: { id: sessionId, workout: { userId } },
    data: { note },
  });
  return count > 0;
}

export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  // Sets go with it via onDelete: Cascade.
  const { count } = await db.workoutSession.deleteMany({
    where: { id: sessionId, workout: { userId } },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

export interface SetWriteData {
  exerciseId: string;
  position: number;
  reps: number;
  weightKg: number;
}

/**
 * Log or un-log one set.
 *
 * The exercise has to belong to the same workout as the session — checked here
 * rather than assumed, because the pair arrives from the client and nothing
 * else downstream would notice a set filed under somebody else's movement.
 *
 * The write is an upsert against the (sessionId, exerciseId, position) unique,
 * so correcting a set overwrites it and a double-tap settles on one row.
 */
export async function logSet(
  userId: string,
  sessionId: string,
  data: SetWriteData,
): Promise<boolean> {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, workout: { userId } },
    select: { id: true, workoutId: true },
  });
  if (!session) return false;

  const exercise = await db.workoutExercise.findFirst({
    where: { id: data.exerciseId, workoutId: session.workoutId },
    select: { id: true },
  });
  if (!exercise) return false;

  await db.workoutSet.upsert({
    where: {
      sessionId_exerciseId_position: {
        sessionId,
        exerciseId: data.exerciseId,
        position: data.position,
      },
    },
    create: {
      sessionId,
      exerciseId: data.exerciseId,
      position: data.position,
      reps: data.reps,
      weightKg: data.weightKg,
    },
    update: { reps: data.reps, weightKg: data.weightKg },
  });

  return true;
}

export async function unlogSet(
  userId: string,
  sessionId: string,
  exerciseId: string,
  position: number,
): Promise<boolean> {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, workout: { userId } },
    select: { id: true },
  });
  if (!session) return false;

  await db.workoutSet.deleteMany({ where: { sessionId, exerciseId, position } });
  return true;
}

// ---------------------------------------------------------------------------
// Aggregates for the Life Score and the Coach
// ---------------------------------------------------------------------------

export interface WorkoutAdherence {
  /** Workouts currently tracked — archived ones are not owed anything. */
  activeCount: number;
  /** Sessions the plans asked for over the trailing window. */
  expected: number;
  /** Sessions actually completed in that window. */
  done: number;
}

/**
 * Adherence over the trailing `days`, for the Life Score.
 *
 * Computed here rather than by shipping every session to the scoring function:
 * the "done" side is a single COUNT, and the "expected" side needs only each
 * workout's plan mask and creation date, which are a handful of small rows.
 *
 * Each workout's window is clipped to its own creation day, so a programme
 * added yesterday is asked for one day's worth rather than a month's —
 * otherwise creating a workout would *lower* the score, which is backwards.
 *
 * Archived workouts are excluded from both sides. They owe nothing, and the
 * sessions they earned before archiving are not evidence about this week.
 */
export async function getWorkoutAdherence(
  userId: string,
  timezone: string,
  today: CalendarDay,
  days: number,
): Promise<WorkoutAdherence> {
  const windowFrom = addDays(today, -(days - 1));

  const workouts = await db.workout.findMany({
    where: { userId, archivedAt: null },
    select: { weekdayMask: true, createdAt: true },
  });

  if (workouts.length === 0) return { activeCount: 0, expected: 0, done: 0 };

  const expected = workouts.reduce((total, workout) => {
    const from = maxDay(windowFrom, dayInZone(workout.createdAt, timezone));
    if (diffDays(from, today) < 0) return total;
    return total + expectedSessions(workout.weekdayMask, from, today);
  }, 0);

  const done = await db.workoutSession.count({
    where: {
      workout: { userId, archivedAt: null },
      completedAt: { not: null },
      day: { gte: dayToDate(windowFrom), lte: dayToDate(today) },
    },
  });

  return { activeCount: workouts.length, expected, done };
}

/** Active workouts only — what a counter should reflect. */
export async function countActiveWorkouts(userId: string): Promise<number> {
  return db.workout.count({ where: { userId, archivedAt: null } });
}
