import "server-only";
import { db } from "@/server/db";
import { addDays, endOfDayInZone, type CalendarDay } from "@/shared/lib/calendar-day";
import type { GoalItem } from "@/features/goals/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate
 * "does this belong to you?" check that a future caller could forget.
 *
 * The mutations use updateMany/deleteMany rather than update/delete on purpose.
 * Prisma's single-row update needs a unique where, and { id, userId } is not a
 * declared unique pair; the *Many variants accept the compound filter and
 * report 0 affected rows for an id that exists but belongs to somebody else,
 * which is exactly the answer the action needs.
 */

type GoalRow = {
  id: string;
  title: string;
  isCompleted: boolean;
  targetDate: Date | null;
  note: string | null;
  createdAt: Date;
  steps: { id: string; title: string; isDone: boolean }[];
};

function toGoalItem(goal: GoalRow): GoalItem {
  return {
    id: goal.id,
    title: goal.title,
    isCompleted: goal.isCompleted,
    targetDate: goal.targetDate?.toISOString() ?? null,
    note: goal.note,
    createdAt: goal.createdAt.toISOString(),
    steps: goal.steps.map((step) => ({
      id: step.id,
      title: step.title,
      isDone: step.isDone,
    })),
  };
}

export async function listGoals(userId: string): Promise<GoalItem[]> {
  const goals = await db.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { steps: { orderBy: { createdAt: "asc" } } },
  });

  return goals.map(toGoalItem);
}

export async function createGoal(
  userId: string,
  data: { title: string; targetDate: Date | null; note: string | null },
) {
  return db.goal.create({ data: { userId, ...data } });
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: { title: string; targetDate: Date | null; note: string | null },
): Promise<boolean> {
  const { count } = await db.goal.updateMany({ where: { id: goalId, userId }, data });
  return count > 0;
}

/**
 * completedAt moves with isCompleted, always — the same rule setTaskCompleted
 * follows. The pair is the record of *when* a goal was closed, which is what
 * the AI Coach's day-over-day report reads; letting a re-opened goal keep its
 * old timestamp would leave it counted as yesterday's win forever.
 */
export async function setGoalCompleted(
  userId: string,
  goalId: string,
  isCompleted: boolean,
): Promise<boolean> {
  const { count } = await db.goal.updateMany({
    where: { id: goalId, userId },
    data: { isCompleted, completedAt: isCompleted ? new Date() : null },
  });
  return count > 0;
}

export async function deleteGoal(userId: string, goalId: string): Promise<boolean> {
  // Steps go with it via onDelete: Cascade on GoalStep.goalId.
  const { count } = await db.goal.deleteMany({ where: { id: goalId, userId } });
  return count > 0;
}

// Steps are reached through their parent goal's owner: `goal: { userId }` is a
// relation filter, so an id belonging to someone else's goal matches nothing.
export async function createGoalStep(
  userId: string,
  goalId: string,
  title: string,
): Promise<boolean> {
  const goal = await db.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  if (!goal) return false;

  await db.goalStep.create({ data: { goalId, title } });
  return true;
}

export async function setGoalStepDone(
  userId: string,
  stepId: string,
  isDone: boolean,
): Promise<boolean> {
  const { count } = await db.goalStep.updateMany({
    where: { id: stepId, goal: { userId } },
    data: { isDone },
  });
  return count > 0;
}

export async function deleteGoalStep(userId: string, stepId: string): Promise<boolean> {
  const { count } = await db.goalStep.deleteMany({
    where: { id: stepId, goal: { userId } },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export interface GoalStanding {
  /** Goals that existed and were still open at the end of the day. */
  active: number;
  /** Goals closed on that day. */
  completedOnDay: number;
  /** Every goal that existed by then — what the Life Score counts. */
  total: number;
}

/**
 * Where the goals stood at the end of a given day, for the AI Coach's
 * day-over-day report. Passing today gives today; passing yesterday genuinely
 * reconstructs yesterday, the same way getTaskThroughput does.
 *
 * A goal completed before Goal.completedAt existed has a null timestamp. Those
 * count as closed *before* any window rather than as still open — the opposite
 * reading would resurrect every historically finished goal into today's active
 * list, which is both wrong and loud.
 */
export async function getGoalStanding(
  userId: string,
  day: CalendarDay,
  timezone: string,
): Promise<GoalStanding> {
  const end = endOfDayInZone(day, timezone);
  // The previous day's end is this day's start — subtracting 24h would be
  // wrong by an hour on both DST changeovers.
  const start = endOfDayInZone(addDays(day, -1), timezone);

  const [total, closedByThen, completedOnDay] = await Promise.all([
    db.goal.count({ where: { userId, createdAt: { lte: end } } }),
    db.goal.count({
      where: {
        userId,
        createdAt: { lte: end },
        isCompleted: true,
        OR: [{ completedAt: null }, { completedAt: { lte: end } }],
      },
    }),
    db.goal.count({
      where: { userId, isCompleted: true, completedAt: { gt: start, lte: end } },
    }),
  ]);

  return { active: total - closedByThen, completedOnDay, total };
}
