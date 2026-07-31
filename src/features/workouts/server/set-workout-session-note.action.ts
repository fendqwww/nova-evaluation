"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { sessionNoteSchema } from "@/features/workouts/schemas";
import { setSessionNote } from "@/features/workouts/server/workouts.repository";

const setWorkoutSessionNoteInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  note: sessionNoteSchema,
});

export type SetWorkoutSessionNoteInput = z.input<typeof setWorkoutSessionNoteInputSchema>;

/** How the session actually went — the one thing numbers cannot record. */
export async function setWorkoutSessionNoteAction(input: SetWorkoutSessionNoteInput) {
  const { rawInitData, sessionId, note } = setWorkoutSessionNoteInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await setSessionNote(userId, sessionId, note);
  if (!updated) throw new Error("SESSION_NOT_FOUND");

  return { success: true } as const;
}
