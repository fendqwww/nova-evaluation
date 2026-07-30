"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createGoalStep } from "@/features/goals/server/goals.repository";
import { goalStepTitleSchema } from "@/features/goals/schemas";

const createGoalStepInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
  title: goalStepTitleSchema,
});

export type CreateGoalStepInput = z.infer<typeof createGoalStepInputSchema>;

export async function createGoalStepAction(input: CreateGoalStepInput) {
  const { rawInitData, goalId, title } = createGoalStepInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const created = await createGoalStep(userId, goalId, title);
  if (!created) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
