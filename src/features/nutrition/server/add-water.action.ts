"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { addWater } from "@/features/nutrition/server/nutrition.repository";
import { calendarDaySchema, waterDeltaSchema } from "@/features/nutrition/schemas";

const addWaterInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  day: calendarDaySchema,
  deltaMl: waterDeltaSchema,
});

export type AddWaterInput = z.input<typeof addWaterInputSchema>;

export async function addWaterAction(input: AddWaterInput) {
  const { rawInitData, day, deltaMl } = addWaterInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const amountMl = await addWater(userId, day, deltaMl);

  return { success: true, amountMl } as const;
}
