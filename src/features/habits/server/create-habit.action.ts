"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createHabit } from "@/features/habits/server/habits.repository";
import { habitDraftSchema } from "@/features/habits/schemas";

const createHabitInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: habitDraftSchema,
});

// z.input, not z.infer: habitDraftSchema normalises "" to null on the way
// through, so the shape the client sends is the pre-transform one.
export type CreateHabitInput = z.input<typeof createHabitInputSchema>;

export async function createHabitAction(input: CreateHabitInput) {
  const { rawInitData, draft } = createHabitInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  await createHabit(userId, {
    title: draft.title,
    note: draft.note,
    schedule: draft.schedule,
  });

  return { success: true } as const;
}
