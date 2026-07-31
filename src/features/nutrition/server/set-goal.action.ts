"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setGoal } from "@/features/nutrition/server/nutrition.repository";
import { goalDraftSchema } from "@/features/nutrition/schemas";

const setGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: goalDraftSchema,
});

export type SetGoalInput = z.input<typeof setGoalInputSchema>;

export async function setGoalAction(input: SetGoalInput) {
  const { rawInitData, draft } = setGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const goal = await setGoal(userId, draft);

  return { success: true, goal } as const;
}
