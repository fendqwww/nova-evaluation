"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteGoal } from "@/features/goals/server/goals.repository";

const deleteGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
});

export type DeleteGoalInput = z.infer<typeof deleteGoalInputSchema>;

export async function deleteGoalAction(input: DeleteGoalInput) {
  const { rawInitData, goalId } = deleteGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteGoal(userId, goalId);
  if (!deleted) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
