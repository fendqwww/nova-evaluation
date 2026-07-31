"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deleteEntry } from "@/features/nutrition/server/nutrition.repository";

const deleteEntryInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  entryId: z.string().min(1),
});

export type DeleteEntryInput = z.input<typeof deleteEntryInputSchema>;

export async function deleteEntryAction(input: DeleteEntryInput) {
  const { rawInitData, entryId } = deleteEntryInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deleteEntry(userId, entryId);
  if (!deleted) throw new Error("ENTRY_NOT_FOUND");

  return { success: true } as const;
}
