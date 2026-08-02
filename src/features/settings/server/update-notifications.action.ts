"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setNotifications } from "@/features/settings/server/settings.repository";
import { notificationsDraftSchema } from "@/features/settings/schemas";

const updateNotificationsInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: notificationsDraftSchema,
});

export type UpdateNotificationsInput = z.infer<typeof updateNotificationsInputSchema>;

/**
 * The six notification switches.
 *
 * The whole set travels on every write, not the one switch that moved. A
 * settings screen with six toggles is edited by tapping several in a row, and
 * six independent writes racing each other is how a screen ends up disagreeing
 * with its own database — sending the full state means the last write wins
 * coherently.
 *
 * Nothing sends a notification yet. This stores an intention, which is exactly
 * what the UI claims it does.
 */
export async function updateNotificationsAction(input: UpdateNotificationsInput) {
  const { rawInitData, draft } = updateNotificationsInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const settings = await setNotifications(userId, draft);

  return { success: true, settings } as const;
}
