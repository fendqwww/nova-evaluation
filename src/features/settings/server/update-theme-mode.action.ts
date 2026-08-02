"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setThemeMode } from "@/features/settings/server/settings.repository";
import { themeModeSchema } from "@/features/settings/schemas";

const updateThemeModeInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  themeMode: themeModeSchema,
});

export type UpdateThemeModeInput = z.infer<typeof updateThemeModeInputSchema>;

/**
 * Light, dark or system.
 *
 * A separate action from updateTheme (features/profile), which writes the
 * accent hue onto Profile. The two are different axes stored in different
 * tables, and folding them into one write would mean every accent change
 * touched the settings row and vice versa.
 */
export async function updateThemeModeAction(input: UpdateThemeModeInput) {
  const { rawInitData, themeMode } = updateThemeModeInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const settings = await setThemeMode(userId, themeMode);

  return { success: true, settings } as const;
}
