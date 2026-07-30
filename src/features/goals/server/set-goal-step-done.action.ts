"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setGoalStepDone } from "@/features/goals/server/goals.repository";

const setGoalStepDoneInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  stepId: z.string().min(1),
  isDone: z.boolean(),
});

export type SetGoalStepDoneInput = z.infer<typeof setGoalStepDoneInputSchema>;

export async function setGoalStepDoneAction(input: SetGoalStepDoneInput) {
  const { rawInitData, stepId, isDone } = setGoalStepDoneInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setGoalStepDone(userId, stepId, isDone);
  if (!updated) throw new Error("GOAL_STEP_NOT_FOUND");

  return { success: true } as const;
}
