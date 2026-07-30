"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateGoal } from "@/features/goals/server/goals.repository";
import { goalDraftSchema } from "@/features/goals/schemas";
import { parseTargetDate } from "@/features/goals/lib/format";

const updateGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goalId: z.string().min(1),
  draft: goalDraftSchema,
});

export type UpdateGoalInput = z.input<typeof updateGoalInputSchema>;

export async function updateGoalAction(input: UpdateGoalInput) {
  const { rawInitData, goalId, draft } = updateGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateGoal(userId, goalId, {
    title: draft.title,
    targetDate: draft.targetDate ? parseTargetDate(draft.targetDate) : null,
    note: draft.note,
  });

  // Indistinguishable from "does not exist" on purpose: a caller poking at
  // other people's ids learns nothing about whether they are real.
  if (!updated) throw new Error("GOAL_NOT_FOUND");

  return { success: true } as const;
}
