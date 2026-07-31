"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { applyTemplate } from "@/features/nutrition/server/nutrition.repository";
import { calendarDaySchema, mealSlotSchema } from "@/features/nutrition/schemas";

const applyTemplateInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  templateId: z.string().min(1),
  mealSlot: mealSlotSchema,
  day: calendarDaySchema,
});

export type ApplyTemplateInput = z.input<typeof applyTemplateInputSchema>;

export async function applyTemplateAction(input: ApplyTemplateInput) {
  const { rawInitData, templateId, mealSlot, day } = applyTemplateInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const entries = await applyTemplate(userId, templateId, mealSlot, day);
  if (entries.length === 0) throw new Error("TEMPLATE_NOT_FOUND");

  return { success: true, entries } as const;
}
