"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteCompletedTasks } from "@/features/tasks/server/tasks.repository";

const clearCompletedTasksInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
});

export type ClearCompletedTasksInput = z.infer<typeof clearCompletedTasksInputSchema>;

/**
 * Deletes every finished task in one call.
 *
 * The "Выполнено" group is a record, not a queue, and it grows without bound —
 * without this the only way to clear a month of finished work is a confirm
 * dialog per row. Returns the count so the UI can say what it removed rather
 * than just going quiet.
 */
export async function clearCompletedTasksAction(input: ClearCompletedTasksInput) {
  const { rawInitData } = clearCompletedTasksInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const removed = await deleteCompletedTasks(userId);

  return { success: true, removed } as const;
}
