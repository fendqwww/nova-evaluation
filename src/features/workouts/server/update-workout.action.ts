"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateWorkout } from "@/features/workouts/server/workouts.repository";
import { workoutDraftSchema } from "@/features/workouts/schemas";

const updateWorkoutInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  workoutId: z.string().min(1),
  draft: workoutDraftSchema,
});

export type UpdateWorkoutInput = z.input<typeof updateWorkoutInputSchema>;

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  const { rawInitData, workoutId, draft } = updateWorkoutInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateWorkout(userId, workoutId, {
    title: draft.title,
    note: draft.note,
    category: draft.category,
    weekdayMask: draft.weekdayMask,
    exercises: draft.exercises,
  });
  if (!updated) throw new Error("WORKOUT_NOT_FOUND");

  return { success: true } as const;
}
