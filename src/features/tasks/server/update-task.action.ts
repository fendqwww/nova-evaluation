"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateTask } from "@/features/tasks/server/tasks.repository";
import { taskDraftSchema } from "@/features/tasks/schemas";

const updateTaskInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  taskId: z.string().min(1),
  draft: taskDraftSchema,
});

export type UpdateTaskInput = z.input<typeof updateTaskInputSchema>;

/**
 * Editing never touches completion. isCompleted and completedAt move together
 * and only through setTaskCompletedAction, so re-dating a finished task cannot
 * accidentally re-open it or rewrite when it was done.
 */
export async function updateTaskAction(input: UpdateTaskInput) {
  const { rawInitData, taskId, draft } = updateTaskInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateTask(userId, taskId, {
    title: draft.title,
    note: draft.note,
    dueDate: draft.dueDate,
    priority: draft.priority,
  });
  if (!updated) throw new Error("TASK_NOT_FOUND");

  return { success: true } as const;
}
