import "server-only";
import { db } from "@/server/db";
import type { ActivityItemType, ActivityCounts, ActiveItem } from "@/features/activity/types";

export async function createActivityItem(
  userId: string,
  type: ActivityItemType,
  title: string,
) {
  switch (type) {
    case "goal":
      return db.goal.create({ data: { userId, title } });
    case "habit":
      return db.habit.create({ data: { userId, title } });
    case "task":
      return db.task.create({ data: { userId, title } });
  }
}

export async function getActivityCounts(userId: string): Promise<ActivityCounts> {
  const [goals, habits, tasks] = await Promise.all([
    db.goal.count({ where: { userId } }),
    db.habit.count({ where: { userId } }),
    db.task.count({ where: { userId } }),
  ]);

  return { goals, habits, tasks };
}

// First active Goal, else first active Task, else null — Focus of Day
// deliberately doesn't fall back to Habit: an ongoing habit isn't a
// single "today" focus the way a goal or task is.
export async function getFocusOfDay(userId: string): Promise<ActiveItem | null> {
  const goal = await db.goal.findFirst({
    where: { userId, isCompleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (goal) return { id: goal.id, title: goal.title, type: "goal" };

  const task = await db.task.findFirst({
    where: { userId, isCompleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (task) return { id: task.id, title: task.title, type: "task" };

  return null;
}
