"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createTask } from "@/features/tasks/server/tasks.repository";
import { taskDraftSchema } from "@/features/tasks/schemas";

const createTaskInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: taskDraftSchema,
});

// z.input, not z.infer: taskDraftSchema normalises "" to null on the way
// through, so the shape the client sends is the pre-transform one.
export type CreateTaskInput = z.input<typeof createTaskInputSchema>;

export async function createTaskAction(input: CreateTaskInput) {
  const { rawInitData, draft } = createTaskInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  await createTask(userId, {
    title: draft.title,
    note: draft.note,
    dueDate: draft.dueDate,
    priority: draft.priority,
  });

  return { success: true } as const;
}
