"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { restartOnboarding } from "@/features/settings/server/settings.repository";

const restartOnboardingInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
});

export type RestartOnboardingInput = z.infer<typeof restartOnboardingInputSchema>;

/**
 * Reopen the onboarding flow.
 *
 * Clears onboardingCompletedAt and nothing else — the Profile row survives, so
 * the flow opens pre-filled with the current answers and completing it updates
 * them in place (completeOnboarding upserts). Nothing in any section is
 * touched: goals, habits and history all belong to the user, not to the
 * questionnaire that started them.
 *
 * The caller navigates afterwards. Every screen already redirects to
 * /onboarding when the stamp is missing, so the navigation is a courtesy that
 * saves a round trip rather than the thing that enforces the flow.
 */
export async function restartOnboardingAction(input: RestartOnboardingInput) {
  const { rawInitData } = restartOnboardingInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  await restartOnboarding(userId);

  return { success: true } as const;
}
