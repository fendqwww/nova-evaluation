"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createCareGoal } from "@/features/appearance/server/appearance.repository";
import { careGoalDraftSchema } from "@/features/appearance/schemas";

const createCareGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: careGoalDraftSchema,
});

export type CreateCareGoalInput = z.input<typeof createCareGoalInputSchema>;

export async function createCareGoalAction(input: CreateCareGoalInput) {
  const { rawInitData, draft } = createCareGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const goal = await createCareGoal(userId, draft);

  return { success: true, goalId: goal.id } as const;
}
