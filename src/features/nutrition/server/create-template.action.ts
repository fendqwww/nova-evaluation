"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createTemplate } from "@/features/nutrition/server/nutrition.repository";
import { templateDraftSchema } from "@/features/nutrition/schemas";

const createTemplateInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: templateDraftSchema,
});

export type CreateTemplateInput = z.input<typeof createTemplateInputSchema>;

export async function createTemplateAction(input: CreateTemplateInput) {
  const { rawInitData, draft } = createTemplateInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const template = await createTemplate(userId, draft);

  return { success: true, templateId: template.id } as const;
}
