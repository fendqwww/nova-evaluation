"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { setStepDone } from "@/features/appearance/server/appearance.repository";
import { assertDayInWindow } from "@/features/appearance/server/assert-day-in-window";
import { calendarDaySchema } from "@/features/appearance/schemas";

const setStepDoneInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  stepId: z.string().min(1),
  day: calendarDaySchema,
  isDone: z.boolean(),
});

export type SetStepDoneInput = z.input<typeof setStepDoneInputSchema>;

export async function setStepDoneAction(input: SetStepDoneInput) {
  const { rawInitData, stepId, day, isDone } = setStepDoneInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  assertDayInWindow(day, todayIn(timezone));

  const updated = await setStepDone(userId, stepId, day, isDone);
  if (!updated) throw new Error("STEP_NOT_FOUND");

  return { success: true } as const;
}
