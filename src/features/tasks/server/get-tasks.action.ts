"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { listTasks } from "@/features/tasks/server/tasks.repository";
import type { TasksSnapshot } from "@/features/tasks/types";

/**
 * The Tasks screen in one fetch.
 *
 * `today` is resolved from the profile timezone here, not on the client:
 * "просрочено" is a claim about which day it is, and a device with a skewed
 * clock must not be the one making it.
 */
export async function getTasks(
  rawInitData: string | undefined,
): Promise<TasksSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  return {
    today: todayIn(timezone),
    tasks: await listTasks(userId),
  };
}
