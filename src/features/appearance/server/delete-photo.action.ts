"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { deletePhoto } from "@/features/appearance/server/appearance.repository";

const deletePhotoInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  photoId: z.string().min(1),
});

export type DeletePhotoInput = z.input<typeof deletePhotoInputSchema>;

export async function deletePhotoAction(input: DeletePhotoInput) {
  const { rawInitData, photoId } = deletePhotoInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const deleted = await deletePhoto(userId, photoId);
  if (!deleted) throw new Error("PHOTO_NOT_FOUND");

  return { success: true } as const;
}
