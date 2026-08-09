"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { onboardingProfileSchema } from "@/features/onboarding/schemas";
import { getConsentState } from "@/features/legal/server";
import { calculateTargets } from "@/features/nutrition/lib/targets";

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

  // `aim` is not a Profile column — it exists only to pick the deficit for the
  // first nutrition goal below, after which the goal row is the source of truth
  // and the user edits it directly.
  const { aim, ...profileColumns } = profile;

  await db.user.update({
    where: { telegramId: identity.telegramId },
    data: {
      onboardingCompletedAt: new Date(),
      profile: {
        upsert: {
          create: profileColumns,
          update: profileColumns,
        },
      },
    },
    select: { id: true },
  });

  /**
   * Seed the calorie and macro target from the body just recorded.
   *
   * This is the point of having asked. The diary used to open with every bar at
   * zero of zero and a settings sheet whose calorie field said "2000" in grey —
   * a person who did not already know their own number could not use the
   * section at all. Now it opens with four figures that were computed from
   * their own measurements.
   *
   * `create`-only, never an update: re-running onboarding must not silently
   * overwrite a target the user has since tuned by hand. Their number wins over
   * the formula's the moment they touch it.
   */
  const existingGoal = await db.nutritionGoal.findUnique({
    where: { userId: user.id },
    select: { userId: true },
  });

  if (!existingGoal) {
    const targets = calculateTargets({
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      gender: profile.gender,
      activity: profile.activityLevel,
      aim,
    });

    await db.nutritionGoal.create({
      data: {
        userId: user.id,
        calories: targets.calories,
        proteinG: targets.proteinG,
        fatG: targets.fatG,
        carbsG: targets.carbsG,
        waterMl: targets.waterMl,
      },
    });
  }

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
