"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createGoal } from "@/features/goals/server/goals.repository";
import { goalDraftSchema } from "@/features/goals/schemas";
import { parseTargetDate } from "@/features/goals/lib/format";

const createGoalInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: goalDraftSchema,
});

// z.input, not z.infer: goalDraftSchema normalises "" to null on the way
// through, so the shape the client sends is the pre-transform one.
export type CreateGoalInput = z.input<typeof createGoalInputSchema>;

export async function createGoalAction(input: CreateGoalInput) {
  const { rawInitData, draft } = createGoalInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  await createGoal(userId, {
    title: draft.title,
    targetDate: draft.targetDate ? parseTargetDate(draft.targetDate) : null,
    note: draft.note,
  });

  return { success: true } as const;
}
