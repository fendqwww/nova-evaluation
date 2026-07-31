"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createWorkout } from "@/features/workouts/server/workouts.repository";
import { workoutDraftSchema } from "@/features/workouts/schemas";

const createWorkoutInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: workoutDraftSchema,
});

// z.input, not z.infer: the draft schema normalises "" to null on the way
// through, so the shape the client sends is the pre-transform one.
export type CreateWorkoutInput = z.input<typeof createWorkoutInputSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { rawInitData, draft } = createWorkoutInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const workout = await createWorkout(userId, {
    title: draft.title,
    note: draft.note,
    category: draft.category,
    weekdayMask: draft.weekdayMask,
    // Ids never survive a create — a client that sends one is describing a row
    // that does not exist yet, and honouring it would let a forged payload
    // claim an id inside another user's workout.
    exercises: draft.exercises.map((exercise) => ({ ...exercise, id: undefined })),
  });

  return { success: true, workoutId: workout.id } as const;
}
