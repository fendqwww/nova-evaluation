"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { getSettings } from "@/features/settings/server/settings.repository";
import { savePhotoAnalysis } from "@/features/appearance/server/appearance.repository";
import {
  consumeAppearanceAnalysis,
  refundAppearanceAnalysis,
} from "@/features/usage/server";
import { hasAiConsent } from "@/features/legal/server";
import { CONSENT_REQUIRED_MESSAGE } from "@/features/legal/constants";
import { analyzeAppearancePhoto } from "@/ai/appearance";
import { GeminiError } from "@/ai/gemini";
import { imageDataUrlSchema, parseImageDataUrl, type AppearanceAnalysis } from "@/ai/types";

/** Same reasoning as the food-photo ceiling: never stored, forwarded once. */
const APPEARANCE_PHOTO_MAX_CHARS = 1_500_000;

const analyzeAppearancePhotoInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  imageData: imageDataUrlSchema(APPEARANCE_PHOTO_MAX_CHARS),
  /**
   * The row to attach the result to. Optional because the add-photo modal
   * analyses an image that has no row yet — there the result travels back to
   * the client and is written with the photo itself.
   */
  photoId: z.string().min(1).optional(),
});

export type AnalyzeAppearancePhotoInput = z.input<typeof analyzeAppearancePhotoInputSchema>;

/**
 * Read a progress photo into strengths / weaknesses / recommendations.
 *
 * A report, not a write — nothing here touches AppearanceRoutine or
 * AppearanceGoal. A discriminated result rather than a thrown error, the same
 * reasoning as analyzeFoodPhotoAction: Next.js redacts a thrown Error's
 * message in production, and the sentence explaining which limit was reached
 * needs to survive the trip back to the client.
 *
 * The most expensive call in the app — a full-resolution portrait against a
 * long structured schema — which is why FREE gets exactly one for the lifetime
 * of the account and why the unit is reserved atomically before the photo is
 * sent anywhere. It is given straight back if the model fails.
 *
 * Deliberately not cached the way food photos are: two progress photos taken a
 * month apart are meant to read differently, and a portrait is personal in a
 * way a plate of food is not — a cache keyed on image bytes would be a
 * cross-account store of faces to no benefit, since nobody re-sends the same
 * portrait for a second opinion.
 */
export type AnalyzeAppearancePhotoResult =
  | { ok: true; analysis: AppearanceAnalysis }
  | { ok: false; reason: "limit"; message: string; used: number; limit: number }
  | { ok: false; reason: "error"; message: string };

export async function analyzeAppearancePhotoAction(
  input: AnalyzeAppearancePhotoInput,
): Promise<AnalyzeAppearancePhotoResult> {
  const { rawInitData, imageData, photoId } = analyzeAppearancePhotoInputSchema.parse(input);
  // The user's own calendar day: every usage window is measured in their
  // timezone rather than at UTC midnight.
  const { userId, timezone } = await requireUserContext(rawInitData);
  const settings = await getSettings(userId);

  // Основание обработки проверяется раньше настройки — см. пояснение в
  // analyze-food-photo.action.ts. Для фотографии внешности это тем более
  // важно: снимок человека уходит за пределы страны.
  if (!(await hasAiConsent(userId))) {
    return { ok: false, reason: "error", message: CONSENT_REQUIRED_MESSAGE };
  }

  // Same "AI Vision" switch the food-photo action honours — checked before the
  // photo travels anywhere.
  if (!settings.ai.vision) {
    return { ok: false, reason: "error", message: "AI Vision выключен в настройках." };
  }

  const usage = { userId, plan: settings.plan, today: todayIn(timezone) };

  const permission = await consumeAppearanceAnalysis(usage);
  if (!permission.success) {
    return {
      ok: false,
      reason: "limit",
      message: permission.message,
      used: permission.used,
      limit: permission.limit,
    };
  }

  try {
    const analysis = await analyzeAppearancePhoto(parseImageDataUrl(imageData));

    // Persist before returning, so the budget this call just spent buys a
    // result that survives closing the modal. A photo that isn't the caller's
    // simply doesn't match, and the analysis still travels back to them.
    // Refreshing the section is the caller's job, the same as every other
    // mutation here — the client invalidates its appearance query.
    if (photoId) {
      await savePhotoAnalysis(userId, photoId, analysis);
    }

    return { ok: true, analysis };
  } catch (error) {
    await refundAppearanceAnalysis(usage);

    if (error instanceof GeminiError) {
      return { ok: false, reason: "error", message: error.userMessage };
    }
    console.error("[analyzeAppearancePhotoAction] unexpected failure", error);
    return { ok: false, reason: "error", message: "Не удалось проанализировать фото. Попробуй ещё раз." };
  }
}
