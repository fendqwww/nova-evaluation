"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setRegion, setTimezone } from "@/features/settings/server/settings.repository";
import { regionDraftSchema } from "@/features/settings/schemas";

const updateRegionInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: regionDraftSchema,
});

export type UpdateRegionInput = z.infer<typeof updateRegionInputSchema>;

/**
 * Language, timezone, date format and units — saved together.
 *
 * Two tables, one action, in a deliberate order: the timezone lands on Profile
 * (the authority every calendar day in the app is resolved from) and the other
 * three on UserSettings. The zone is written first because it is the only one
 * that can fail on a real user — a Profile row that does not exist yet — and
 * failing before the display preferences are written leaves nothing half
 * applied.
 *
 * A missing Profile is reported rather than swallowed: the screen is only
 * reachable behind a completed onboarding, so it means something is wrong with
 * the account rather than that the user picked a bad zone.
 */
export async function updateRegionAction(input: UpdateRegionInput) {
  const { rawInitData, draft } = updateRegionInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const zoneWritten = await setTimezone(userId, draft.timezone);
  if (!zoneWritten) throw new Error("PROFILE_NOT_FOUND");

  const settings = await setRegion(userId, {
    language: draft.language,
    dateFormat: draft.dateFormat,
    unitSystem: draft.unitSystem,
  });

  return { success: true, settings } as const;
}
