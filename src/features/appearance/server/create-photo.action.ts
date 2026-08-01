"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { createPhoto } from "@/features/appearance/server/appearance.repository";
import { photoDraftSchema } from "@/features/appearance/schemas";
import { assertPhotoDayInWindow } from "@/features/appearance/server/assert-day-in-window";

const createPhotoInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: photoDraftSchema,
});

export type CreatePhotoInput = z.input<typeof createPhotoInputSchema>;

/**
 * Store one progress photo.
 *
 * The bytes arrive already downscaled and JPEG-encoded by lib/image.ts; the
 * schema's ceilings are what make that non-negotiable rather than merely
 * expected, since a forged payload could otherwise write tens of megabytes into
 * a row. Nothing is re-encoded here — the server has no image pipeline, and
 * trusting a *bounded, format-checked* string is the honest version of that.
 */
export async function createPhotoAction(input: CreatePhotoInput) {
  const { rawInitData, draft } = createPhotoInputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  assertPhotoDayInWindow(draft.day, todayIn(timezone));

  const photo = await createPhoto(userId, draft);

  return { success: true, photoId: photo.id } as const;
}
