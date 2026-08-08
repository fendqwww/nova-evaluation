"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setAi } from "@/features/settings/server/settings.repository";
import { aiDraftSchema } from "@/features/settings/schemas";
import { hasAiConsent } from "@/features/legal/server";

const updateAiInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  draft: aiDraftSchema,
});

export type UpdateAiInput = z.infer<typeof updateAiInputSchema>;

/**
 * The AI switches, written as a set for the same reason the notification ones
 * are.
 *
 * `coachEnabled` is the one with teeth: getCoachOverview refuses to build an
 * analysis when it is false, so turning it off actually stops the app sending
 * anything to Gemini rather than only hiding a screen. That is what makes the
 * privacy policy's "если AI Coach выключен, наружу не уходит ничего" a true
 * statement rather than a UI promise.
 *
 * Включить любой из трёх переключателей без действующего согласия на
 * трансграничную передачу нельзя. Переключатель — это выбор пользователя из
 * того, что ему разрешено; согласие — это то, что разрешено. Выключение
 * работает всегда: запретить человеку выключить обработку своих данных не
 * может ничто.
 */
export async function updateAiAction(input: UpdateAiInput) {
  const { rawInitData, draft } = updateAiInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const wantsAi = draft.coachEnabled || draft.dailyReport || draft.vision;
  if (wantsAi && !(await hasAiConsent(userId))) {
    return { success: false, reason: "CONSENT_REQUIRED" } as const;
  }

  const settings = await setAi(userId, draft);

  return { success: true, settings } as const;
}
