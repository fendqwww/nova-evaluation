"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { getPhotoImage } from "@/features/appearance/server/appearance.repository";
import type { CarePhotoImage } from "@/features/appearance/types";

const getPhotoImageInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  photoId: z.string().min(1),
});

export type GetPhotoImageInput = z.input<typeof getPhotoImageInputSchema>;

/**
 * One photo's full-resolution bytes.
 *
 * Deliberately its own round trip rather than a field on the snapshot: the
 * gallery renders thumbnails, and only the viewer and the До/После comparison
 * ever need the real thing — at most two at a time. Ownership is enforced by
 * the query, so a guessed id returns nothing rather than somebody else's photo.
 */
export async function getPhotoImageAction(input: GetPhotoImageInput): Promise<CarePhotoImage> {
  const { rawInitData, photoId } = getPhotoImageInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const imageData = await getPhotoImage(userId, photoId);
  if (imageData === null) throw new Error("PHOTO_NOT_FOUND");

  return { id: photoId, imageData };
}
