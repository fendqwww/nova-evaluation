"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateTemplate } from "@/features/nutrition/server/nutrition.repository";
import { templateDraftSchema } from "@/features/nutrition/schemas";

const updateTemplateInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  templateId: z.string().min(1),
  draft: templateDraftSchema,
});

export type UpdateTemplateInput = z.input<typeof updateTemplateInputSchema>;

export async function updateTemplateAction(input: UpdateTemplateInput) {
  const { rawInitData, templateId, draft } = updateTemplateInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateTemplate(userId, templateId, draft);
  if (!updated) throw new Error("TEMPLATE_NOT_FOUND");

  return { success: true } as const;
}
