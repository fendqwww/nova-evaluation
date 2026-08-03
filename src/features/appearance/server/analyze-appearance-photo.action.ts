"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { getSettings } from "@/features/settings/server/settings.repository";
import { analyzeAppearancePhoto } from "@/ai/appearance";
import { GeminiError } from "@/ai/gemini";
import { AiLimitExceededError } from "@/ai/limits";
import { imageDataUrlSchema, parseImageDataUrl, type AppearanceAnalysis } from "@/ai/types";

/** Same reasoning as the food-photo ceiling: never stored, forwarded once. */
const APPEARANCE_PHOTO_MAX_CHARS = 1_500_000;

const analyzeAppearancePhotoInputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  imageData: imageDataUrlSchema(APPEARANCE_PHOTO_MAX_CHARS),
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
  const { rawInitData, imageData } = analyzeAppearancePhotoInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);
  const settings = await getSettings(userId);

  try {
    const analysis = await analyzeAppearancePhoto(
      userId,
      settings.plan,
      parseImageDataUrl(imageData),
    );
    return { ok: true, analysis };
  } catch (error) {
    if (error instanceof AiLimitExceededError) {
      return { ok: false, reason: "limit", used: error.used, limit: error.limit };
    }
    if (error instanceof GeminiError) {
      return { ok: false, reason: "error", message: error.userMessage };
    }
    console.error("[analyzeAppearancePhotoAction] unexpected failure", error);
    return { ok: false, reason: "error", message: "Не удалось проанализировать фото. Попробуйте ещё раз." };
  }
}
