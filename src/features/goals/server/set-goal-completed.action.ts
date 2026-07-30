"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setGoalCompleted } from "@/features/goals/server/goals.repository";

const setGoalCompletedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
  isCompleted: z.boolean(),
});

export type SetGoalCompletedInput = z.infer<typeof setGoalCompletedInputSchema>;

// Takes the target state rather than toggling server-side: two quick taps then
// settle on the state the user actually sees, instead of racing to flip twice.
export async function setGoalCompletedAction(input: SetGoalCompletedInput) {
  const { rawInitData, goalId, isCompleted } = setGoalCompletedInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setGoalCompleted(userId, goalId, isCompleted);
  if (!updated) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
