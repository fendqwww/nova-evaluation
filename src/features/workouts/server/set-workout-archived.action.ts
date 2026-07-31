"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setWorkoutArchived } from "@/features/workouts/server/workouts.repository";

const setWorkoutArchivedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  workoutId: z.string().min(1),
  isArchived: z.boolean(),
});

export type SetWorkoutArchivedInput = z.infer<typeof setWorkoutArchivedInputSchema>;

export async function setWorkoutArchivedAction(input: SetWorkoutArchivedInput) {
  const { rawInitData, workoutId, isArchived } = setWorkoutArchivedInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setWorkoutArchived(userId, workoutId, isArchived);
  if (!updated) throw new Error("WORKOUT_NOT_FOUND");

  return { success: true } as const;
}
