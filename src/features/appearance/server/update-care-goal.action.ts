"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateCareGoal } from "@/features/appearance/server/appearance.repository";
import { careGoalDraftSchema } from "@/features/appearance/schemas";

const updateCareGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
  draft: careGoalDraftSchema,
});

export type UpdateCareGoalInput = z.input<typeof updateCareGoalInputSchema>;

export async function updateCareGoalAction(input: UpdateCareGoalInput) {
  const { rawInitData, goalId, draft } = updateCareGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateCareGoal(userId, goalId, draft);
  if (!updated) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
