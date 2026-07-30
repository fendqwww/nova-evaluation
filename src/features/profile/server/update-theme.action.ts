"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { THEME_VALUES } from "@/shared/config/themes";

const updateThemeInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  themeColor: z.enum(THEME_VALUES),
});

export type UpdateThemeInput = z.infer<typeof updateThemeInputSchema>;

export async function updateTheme(input: UpdateThemeInput) {
  const { rawInitData, themeColor } = updateThemeInputSchema.parse(input);

  // Same rule as every other write: re-derive identity from freshly verified
  // initData rather than trusting anything the client says about who it is.
  const identity = resolveIdentity(rawInitData);

  // Nested update rather than db.profile.update: the caller knows a telegramId,
  // and Profile is keyed by userId. Reaching it through the relation avoids a
  // second round-trip to translate one into the other.
  await db.user.update({
    where: { telegramId: identity.telegramId },
    data: { profile: { update: { themeColor } } },
  });

  return { success: true } as const;
}
