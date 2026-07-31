"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updateEntryAmount } from "@/features/nutrition/server/nutrition.repository";
import { AMOUNT_G_MAX } from "@/features/nutrition/schemas";

const updateEntryInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  entryId: z.string().min(1),
  amountG: z.number().min(1, "Минимум 1 г").max(AMOUNT_G_MAX, "Слишком большое количество"),
});

export type UpdateEntryInput = z.input<typeof updateEntryInputSchema>;

export async function updateEntryAction(input: UpdateEntryInput) {
  const { rawInitData, entryId, amountG } = updateEntryInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updateEntryAmount(userId, entryId, amountG);
  if (!updated) throw new Error("ENTRY_NOT_FOUND");

  return { success: true } as const;
}
