"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { calendarDaySchema } from "@/features/workouts/schemas";
import { assertDayInWindow } from "@/features/workouts/server/assert-day-in-window";
import { setSessionCompleted } from "@/features/workouts/server/workouts.repository";

const setWorkoutSessionCompletedInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  workoutId: z.string().min(1),
  day: calendarDaySchema,
  isCompleted: z.boolean(),
});

export type SetWorkoutSessionCompletedInput = z.infer<
  typeof setWorkoutSessionCompletedInputSchema
>;

/**
 * Mark a day trained, or take the mark back.
 *
 * Takes the target state rather than toggling server-side, like
 * setHabitLogAction: two quick taps then settle on the state the user actually
 * sees instead of racing to flip twice.
 *
 * Completing a day with no session creates one. That is the honest "я потренил"
 * path from the card and the calendar — a session with no sets still records
 * that the workout happened, and demanding a full set log before the day counts
 * would just push people to stop logging at all.
 */
export async function setWorkoutSessionCompletedAction(
  input: SetWorkoutSessionCompletedInput,
) {
  const { rawInitData, workoutId, day, isCompleted } =
    setWorkoutSessionCompletedInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  assertDayInWindow(day, todayIn(timezone));

  const updated = await setSessionCompleted(userId, workoutId, day, isCompleted);
  if (!updated) throw new Error("WORKOUT_NOT_FOUND");

  return { success: true } as const;
}
