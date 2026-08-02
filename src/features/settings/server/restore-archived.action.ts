"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import {
  deleteArchived,
  restoreArchived,
} from "@/features/settings/server/settings.repository";
import { archiveKindSchema } from "@/features/settings/schemas";

const archiveItemInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  kind: archiveKindSchema,
  id: z.string().min(1),
});

export type ArchiveItemInput = z.infer<typeof archiveItemInputSchema>;

/**
 * Un-archive one row, whichever section it came from.
 *
 * The kind is validated against the union before it reaches the repository's
 * switch, so an unknown kind is a rejected request rather than a silent no-op.
 * A row that is not the caller's reports NOT_FOUND for the same reason every
 * other mutation in the app does — indistinguishable from one that never
 * existed, which is the only answer that leaks nothing.
 */
export async function restoreArchivedAction(input: ArchiveItemInput) {
  const { rawInitData, kind, id } = archiveItemInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const restored = await restoreArchived(userId, kind, id);
  if (!restored) throw new Error("ARCHIVE_ITEM_NOT_FOUND");

  return { success: true } as const;
}

/**
 * Delete an archived row permanently.
 *
 * Fails for a food that has ever been logged: NutritionEntry restricts the
 * delete on purpose, so that a past diary day always names the food it actually
 * contained. The UI turns FOOD_IN_USE into an explanation rather than a generic
 * error, because "this cannot be deleted, and here is why" is the honest
 * outcome — archived is already the intended end state for that food.
 */
export async function deleteArchivedAction(input: ArchiveItemInput) {
  const { rawInitData, kind, id } = archiveItemInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const result = await deleteArchived(userId, kind, id);
  if (result === "in-use") throw new Error("FOOD_IN_USE");
  if (result === "not-found") throw new Error("ARCHIVE_ITEM_NOT_FOUND");

  return { success: true } as const;
}
