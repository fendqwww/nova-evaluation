"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { calendarDaySchema } from "@/features/workouts/schemas";
import { assertDayInWindow } from "@/features/workouts/server/assert-day-in-window";
import { openSession } from "@/features/workouts/server/workouts.repository";

const startWorkoutSessionInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  workoutId: z.string().min(1),
  day: calendarDaySchema,
});

export type StartWorkoutSessionInput = z.infer<typeof startWorkoutSessionInputSchema>;

/**
 * Open a session for a day and hand back its id.
 *
 * Idempotent by construction — the repository upserts against (workoutId, day),
 * so re-entering a workout started this morning continues it rather than
 * wiping the sets already logged. That is also what makes the runner survive
 * the app being closed mid-set: the session is a row, not component state.
 */
export async function startWorkoutSessionAction(input: StartWorkoutSessionInput) {
  const { rawInitData, workoutId, day } = startWorkoutSessionInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  assertDayInWindow(day, todayIn(timezone));

  const sessionId = await openSession(userId, workoutId, day);
  if (!sessionId) throw new Error("WORKOUT_NOT_FOUND");

  return { success: true, sessionId } as const;
}
