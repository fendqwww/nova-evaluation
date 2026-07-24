"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { verifyTelegramInitData } from "@/server/auth/telegram";
import { onboardingProfileSchema } from "@/features/onboarding/schemas";

const completeOnboardingInputSchema = z.object({
  rawInitData: z.string().min(1),
  profile: onboardingProfileSchema,
});

export type CompleteOnboardingInput = z.infer<
  typeof completeOnboardingInputSchema
>;

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const { rawInitData, profile } = completeOnboardingInputSchema.parse(input);

  // Never trust a client-supplied user id for a write — re-derive identity
  // from a freshly verified initData, same as resolveSession.
  const identity = verifyTelegramInitData(rawInitData);

  await db.user.update({
    where: { telegramId: identity.telegramId },
    data: {
      onboardingCompletedAt: new Date(),
      profile: {
        upsert: {
          create: profile,
          update: profile,
        },
      },
    },
  });

  return { success: true } as const;
}
