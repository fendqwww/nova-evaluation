"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setCareGoalCompleted } from "@/features/appearance/server/appearance.repository";

const setCareGoalCompletedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
  isCompleted: z.boolean(),
});

export type SetCareGoalCompletedInput = z.input<typeof setCareGoalCompletedInputSchema>;

export async function setCareGoalCompletedAction(input: SetCareGoalCompletedInput) {
  const { rawInitData, goalId, isCompleted } = setCareGoalCompletedInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setCareGoalCompleted(userId, goalId, isCompleted);
  if (!updated) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
