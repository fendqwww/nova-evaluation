"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateHabit } from "@/features/habits/server/habits.repository";
import { habitDraftSchema } from "@/features/habits/schemas";

const updateHabitInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  habitId: z.string().min(1),
  draft: habitDraftSchema,
});

export type UpdateHabitInput = z.input<typeof updateHabitInputSchema>;

/**
 * Editing a habit never touches its log.
 *
 * Changing the schedule re-interprets history rather than rewriting it: the
 * days kept stay exactly as they were, and adherence is recomputed against the
 * new schedule. Deleting logs that no longer fall on a scheduled day would
 * destroy a real record of something the user actually did.
 */
export async function updateHabitAction(input: UpdateHabitInput) {
  const { rawInitData, habitId, draft } = updateHabitInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateHabit(userId, habitId, {
    title: draft.title,
    note: draft.note,
    schedule: draft.schedule,
  });
  if (!updated) throw new Error("HABIT_NOT_FOUND");

  return { success: true } as const;
}
