"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteCareGoal } from "@/features/appearance/server/appearance.repository";

const deleteCareGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
});

export type DeleteCareGoalInput = z.input<typeof deleteCareGoalInputSchema>;

export async function deleteCareGoalAction(input: DeleteCareGoalInput) {
  const { rawInitData, goalId } = deleteCareGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteCareGoal(userId, goalId);
  if (!deleted) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
