"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteHabit } from "@/features/habits/server/habits.repository";

const deleteHabitInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  habitId: z.string().min(1),
});

export type DeleteHabitInput = z.infer<typeof deleteHabitInputSchema>;

export async function deleteHabitAction(input: DeleteHabitInput) {
  const { rawInitData, habitId } = deleteHabitInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteHabit(userId, habitId);
  if (!deleted) throw new Error("HABIT_NOT_FOUND");

  return { success: true } as const;
}
