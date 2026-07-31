"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { createEntry } from "@/features/nutrition/server/nutrition.repository";
import { entryDraftSchema } from "@/features/nutrition/schemas";

const createEntryInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: entryDraftSchema,
});

export type CreateEntryInput = z.input<typeof createEntryInputSchema>;

export async function createEntryAction(input: CreateEntryInput) {
  const { rawInitData, draft } = createEntryInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const entry = await createEntry(userId, draft);
  if (!entry) throw new Error("FOOD_NOT_FOUND");

  return { success: true, entry } as const;
}
