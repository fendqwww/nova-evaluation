"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { onboardingProfileSchema } from "@/features/onboarding/schemas";
import { getConsentState } from "@/features/legal/server";

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

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
    select: { id: true },
  });

  // Профиль — это возраст, рост, вес и пол, то есть данные о состоянии
  // здоровья. Записать их без действующего согласия нельзя, и проверять это
  // должен сервер: экран согласия стоит первым в потоке, но server action —
  // публичная точка входа, и «первым в потоке» её не защищает.
  const consents = await getConsentState(user.id);
  if (!consents.satisfied) {
    throw new Error("CONSENT_REQUIRED");
  }

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
    select: { id: true },
  });

  // Finishing onboarding used to clear the AI counter here, on the argument
  // that a fresh-looking app should not open by saying the budget is spent.
  // That argument dies with the monthly allowance: restarting onboarding keeps
  // every row the account already has (see restartOnboarding), so a reset here
  // would be a button inside the app that refills a paid allowance — and the
  // FREE appearance analysis, which is granted once per *account*, would be
  // granted again on every lap through the flow. The counters now survive
  // onboarding exactly as the rest of the account does.

  return { success: true } as const;
}
