import "server-only";
import { db } from "@/server/db";
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

export async function setGoalCompleted(
  userId: string,
  goalId: string,
  isCompleted: boolean,
): Promise<boolean> {
  const { count } = await db.goal.updateMany({
    where: { id: goalId, userId },
    data: { isCompleted },
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
