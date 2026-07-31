"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { workoutSetDraftSchema } from "@/features/workouts/schemas";
import { logSet, unlogSet } from "@/features/workouts/server/workouts.repository";

/**
 * One set, logged or taken back.
 *
 * `isDone: false` deletes the row rather than storing a flag — absence is the
 * "not done" state, the same choice HabitLog makes. The two directions share
 * one action because the client always knows the target state and a toggle
 * would race with itself under two quick taps.
 */
const logWorkoutSetInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  set: workoutSetDraftSchema,
  isDone: z.boolean(),
});

export type LogWorkoutSetInput = z.infer<typeof logWorkoutSetInputSchema>;

export async function logWorkoutSetAction(input: LogWorkoutSetInput) {
  const { rawInitData, sessionId, set, isDone } = logWorkoutSetInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const written = isDone
    ? await logSet(userId, sessionId, set)
    : await unlogSet(userId, sessionId, set.exerciseId, set.position);

  if (!written) throw new Error("SESSION_NOT_FOUND");

  return { success: true } as const;
}
