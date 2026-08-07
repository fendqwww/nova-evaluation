"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { getSettings } from "@/features/settings/server/settings.repository";
import { savePhotoAnalysis } from "@/features/appearance/server/appearance.repository";
import { analyzeAppearancePhoto } from "@/ai/appearance";
import { GeminiError } from "@/ai/gemini";
import { AiLimitExceededError } from "@/ai/limits";
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
 * message in production, and "how many analyses do I have left" needs to
 * survive the trip back to the client.
 */
export type AnalyzeAppearancePhotoResult =
  | { ok: true; analysis: AppearanceAnalysis }
  | { ok: false; reason: "limit"; used: number; limit: number }
  | { ok: false; reason: "error"; message: string };

export async function analyzeAppearancePhotoAction(
  input: AnalyzeAppearancePhotoInput,
): Promise<AnalyzeAppearancePhotoResult> {
  const { rawInitData, imageData, photoId } = analyzeAppearancePhotoInputSchema.parse(input);
  // The user's own calendar day, because the AI budget renews per day in their
  // timezone rather than at UTC midnight — see src/ai/limits.ts.
  const { userId, timezone } = await requireUserContext(rawInitData);
  const settings = await getSettings(userId);

  // Same "AI Vision" switch the food-photo action honours — checked before the
  // photo travels anywhere.
  if (!settings.ai.vision) {
    return { ok: false, reason: "error", message: "AI Vision выключен в настройках." };
  }

  try {
    const analysis = await analyzeAppearancePhoto(
      userId,
      settings.plan,
      todayIn(timezone),
      parseImageDataUrl(imageData),
    );

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
    if (error instanceof AiLimitExceededError) {
      return { ok: false, reason: "limit", used: error.used, limit: error.limit };
    }
    if (error instanceof GeminiError) {
      return { ok: false, reason: "error", message: error.userMessage };
    }
    console.error("[analyzeAppearancePhotoAction] unexpected failure", error);
    return { ok: false, reason: "error", message: "Не удалось проанализировать фото. Попробуй ещё раз." };
  }
}
