"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { setRoutineDone } from "@/features/appearance/server/appearance.repository";
import { assertDayInWindow } from "@/features/appearance/server/assert-day-in-window";
import { calendarDaySchema } from "@/features/appearance/schemas";

const setRoutineDoneInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  routineId: z.string().min(1),
  day: calendarDaySchema,
  isDone: z.boolean(),
});

export type SetRoutineDoneInput = z.input<typeof setRoutineDoneInputSchema>;

/**
 * Mark a whole routine done for a day, or undo it.
 *
 * Needs the full user context rather than just the id: which day is being
 * ticked is bounded against the server's own today, and the repository has to
 * resolve each step's creation day in the user's zone to know which steps
 * existed back then.
 */
export async function setRoutineDoneAction(input: SetRoutineDoneInput) {
  const { rawInitData, routineId, day, isDone } = setRoutineDoneInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  assertDayInWindow(day, todayIn(timezone));

  const updated = await setRoutineDone(userId, routineId, day, isDone, timezone);
  if (!updated) throw new Error("ROUTINE_NOT_FOUND");

  return { success: true } as const;
}
