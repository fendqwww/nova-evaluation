"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { applyQuickTemplate } from "@/features/nutrition/server/nutrition.repository";
import { calendarDaySchema, mealSlotSchema } from "@/features/nutrition/schemas";
import { quickTemplateById } from "@/features/nutrition/lib/quick-templates";

const applyQuickTemplateInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  templateId: z.string().min(1),
  mealSlot: mealSlotSchema,
  day: calendarDaySchema,
});

export type ApplyQuickTemplateInput = z.input<typeof applyQuickTemplateInputSchema>;

export async function applyQuickTemplateAction(input: ApplyQuickTemplateInput) {
  const { rawInitData, templateId, mealSlot, day } = applyQuickTemplateInputSchema.parse(input);

  // The id space is a fixed, server-owned list, not client data — a forged
  // id simply fails the lookup rather than reaching the database.
  const preset = quickTemplateById(templateId);
  if (!preset) throw new Error("TEMPLATE_NOT_FOUND");

  const userId = await requireUserId(rawInitData);
  const entry = await applyQuickTemplate(userId, preset, mealSlot, day);

  return { success: true, entry } as const;
}
