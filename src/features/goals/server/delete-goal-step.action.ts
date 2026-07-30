"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteGoalStep } from "@/features/goals/server/goals.repository";

const deleteGoalStepInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  stepId: z.string().min(1),
});

export type DeleteGoalStepInput = z.infer<typeof deleteGoalStepInputSchema>;

export async function deleteGoalStepAction(input: DeleteGoalStepInput) {
  const { rawInitData, stepId } = deleteGoalStepInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteGoalStep(userId, stepId);
  if (!deleted) throw new Error("GOAL_STEP_NOT_FOUND");

  return { success: true } as const;
}
