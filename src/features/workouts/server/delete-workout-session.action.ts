"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteSession } from "@/features/workouts/server/workouts.repository";

const deleteWorkoutSessionInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  sessionId: z.string().min(1),
});

export type DeleteWorkoutSessionInput = z.infer<typeof deleteWorkoutSessionInputSchema>;

/** Removing a session removes its sets with it — a day that did not happen. */
export async function deleteWorkoutSessionAction(input: DeleteWorkoutSessionInput) {
  const { rawInitData, sessionId } = deleteWorkoutSessionInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteSession(userId, sessionId);
  if (!deleted) throw new Error("SESSION_NOT_FOUND");

  return { success: true } as const;
}
