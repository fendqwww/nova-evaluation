"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { resetDailyAiUsage } from "@/ai/limits";
import { onboardingProfileSchema } from "@/features/onboarding/schemas";

const completeOnboardingInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  profile: onboardingProfileSchema,
});

export type CompleteOnboardingInput = z.infer<
  typeof completeOnboardingInputSchema
>;

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const { rawInitData, profile } = completeOnboardingInputSchema.parse(input);

  // Never trust a client-supplied user id for a write — re-derive identity
  // from a freshly verified initData, same as resolveSession.
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.update({
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
    select: { id: true },
  });

  // Finishing the flow is the one moment the app promises a fresh start, and
  // the Coach is the first screen that start leads to. Restarting onboarding
  // deliberately keeps every row the account already has (see
  // restartOnboarding), so without this a returning user landed on a
  // brand-new-looking app that immediately told them their AI was spent.
  await resetDailyAiUsage(user.id);

  return { success: true } as const;
}
