"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteTask } from "@/features/tasks/server/tasks.repository";

const deleteTaskInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  taskId: z.string().min(1),
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

export async function deleteTaskAction(input: DeleteTaskInput) {
  const { rawInitData, taskId } = deleteTaskInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteTask(userId, taskId);
  if (!deleted) throw new Error("TASK_NOT_FOUND");

  return { success: true } as const;
}
