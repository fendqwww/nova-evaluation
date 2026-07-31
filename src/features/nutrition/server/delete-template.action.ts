"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteTemplate } from "@/features/nutrition/server/nutrition.repository";

const deleteTemplateInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  templateId: z.string().min(1),
});

export type DeleteTemplateInput = z.input<typeof deleteTemplateInputSchema>;

export async function deleteTemplateAction(input: DeleteTemplateInput) {
  const { rawInitData, templateId } = deleteTemplateInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteTemplate(userId, templateId);
  if (!deleted) throw new Error("TEMPLATE_NOT_FOUND");

  return { success: true } as const;
}
