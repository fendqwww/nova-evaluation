"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setHabitArchived } from "@/features/habits/server/habits.repository";

const setHabitArchivedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  habitId: z.string().min(1),
  isArchived: z.boolean(),
});

export type SetHabitArchivedInput = z.infer<typeof setHabitArchivedInputSchema>;

/**
 * Stop tracking a habit without losing what it earned.
 *
 * Archiving is the answer to "I'm done with this one" and deletion is the
 * answer to "this was a mistake". Keeping them separate is what lets the first
 * one be reversible: the history survives, so un-archiving restores the streak
 * rather than starting from zero.
 */
export async function setHabitArchivedAction(input: SetHabitArchivedInput) {
  const { rawInitData, habitId, isArchived } = setHabitArchivedInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setHabitArchived(userId, habitId, isArchived);
  if (!updated) throw new Error("HABIT_NOT_FOUND");

  return { success: true } as const;
}
