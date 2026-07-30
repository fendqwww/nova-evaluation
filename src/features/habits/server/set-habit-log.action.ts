"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { diffDays, todayIn } from "@/shared/lib/calendar-day";
import { calendarDaySchema } from "@/features/habits/schemas";
import { LOG_WINDOW_DAYS, setHabitLog } from "@/features/habits/server/habits.repository";

const setHabitLogInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  habitId: z.string().min(1),
  day: calendarDaySchema,
  isDone: z.boolean(),
});

export type SetHabitLogInput = z.infer<typeof setHabitLogInputSchema>;

/**
 * Tick or un-tick one day of one habit.
 *
 * Takes the target state rather than toggling server-side, like
 * setGoalCompletedAction: two quick taps then settle on the state the user
 * actually sees, instead of racing to flip twice.
 *
 * The day is bounded against the server's own idea of today. Backdating within
 * the loaded window is legitimate — people log the run they forgot on Tuesday —
 * but a future day has not happened yet, and a day older than the window could
 * never be seen or undone in the UI. Both would only ever arrive from a forged
 * payload, and both would manufacture a streak nobody earned.
 */
export async function setHabitLogAction(input: SetHabitLogInput) {
  const { rawInitData, habitId, day, isDone } = setHabitLogInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);
  const age = diffDays(day, today);
  if (age < 0) throw new Error("DAY_IN_FUTURE");
  if (age >= LOG_WINDOW_DAYS) throw new Error("DAY_OUT_OF_WINDOW");

  const updated = await setHabitLog(userId, habitId, day, isDone);
  if (!updated) throw new Error("HABIT_NOT_FOUND");

  return { success: true } as const;
}
