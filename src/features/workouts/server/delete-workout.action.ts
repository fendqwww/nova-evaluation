"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteWorkout } from "@/features/workouts/server/workouts.repository";

const deleteWorkoutInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  workoutId: z.string().min(1),
});

export type DeleteWorkoutInput = z.infer<typeof deleteWorkoutInputSchema>;

export async function deleteWorkoutAction(input: DeleteWorkoutInput) {
  const { rawInitData, workoutId } = deleteWorkoutInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteWorkout(userId, workoutId);
  if (!deleted) throw new Error("WORKOUT_NOT_FOUND");

  return { success: true } as const;
}
