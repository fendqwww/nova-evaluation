"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { updatePhotoMeta } from "@/features/appearance/server/appearance.repository";
import { PHOTO_NOTE_MAX, careAreaSchema } from "@/features/appearance/schemas";

const updatePhotoInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  photoId: z.string().min(1),
  area: careAreaSchema,
  note: z
    .string()
    .trim()
    .max(PHOTO_NOTE_MAX, "Слишком длинная заметка")
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export type UpdatePhotoInput = z.input<typeof updatePhotoInputSchema>;

export async function updatePhotoAction(input: UpdatePhotoInput) {
  const { rawInitData, photoId, area, note } = updatePhotoInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const updated = await updatePhotoMeta(userId, photoId, { area, note });
  if (!updated) throw new Error("PHOTO_NOT_FOUND");

  return { success: true } as const;
}
