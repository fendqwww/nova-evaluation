"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setTaskCompleted } from "@/features/tasks/server/tasks.repository";

const setTaskCompletedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  taskId: z.string().min(1),
  isCompleted: z.boolean(),
});

export type SetTaskCompletedInput = z.infer<typeof setTaskCompletedInputSchema>;

// Takes the target state rather than toggling server-side: two quick taps then
// settle on the state the user actually sees, instead of racing to flip twice.
export async function setTaskCompletedAction(input: SetTaskCompletedInput) {
  const { rawInitData, taskId, isCompleted } = setTaskCompletedInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setTaskCompleted(userId, taskId, isCompleted);
  if (!updated) throw new Error("TASK_NOT_FOUND");

  return { success: true } as const;
}
