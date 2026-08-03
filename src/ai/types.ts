import { z } from "zod";

/**
 * A bounded, format-checked inline JPEG — the same convention
 * features/appearance/schemas.ts uses for a stored photo, applied here to a
 * photo that is only ever forwarded to Gemini and never written to a row.
 * Bounding it is still required: an unbounded string in a server action input
 * is a payload-size attack surface regardless of what happens to it next.
 */
export function imageDataUrlSchema(maxChars: number) {
  return z
    .string()
    .startsWith("data:image/jpeg;base64,", "Неподдерживаемый формат изображения")
    .max(maxChars, "Слишком большое изображение");
}

/** The inline-data shape `generateStructured` (ai/gemini.ts) sends to Gemini. */
export function parseImageDataUrl(dataUrl: string): { base64Data: string; mimeType: string } {
  const [header, base64Data] = dataUrl.split(",", 2);
  const mimeType = /^data:(.+);base64$/.exec(header)?.[1] ?? "image/jpeg";
  return { base64Data: base64Data ?? "", mimeType };
}

/**
 * Every surface that spends from the shared usage counter (see limits.ts).
 * Kept as one union here rather than three separate string literals scattered
 * across features, so adding a fourth AI feature later means widening this
 * one type and nothing else forgets about it.
 */
export const AI_FEATURES = ["coach", "food", "appearance"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

// ---------------------------------------------------------------------------
// Food-photo analysis
// ---------------------------------------------------------------------------

export const foodAnalysisSchema = z.object({
  isFood: z.boolean(),
  name: z.string().trim().min(1).max(120),
  portionDescription: z.string().trim().max(120),
  /** Numeric estimate in grams — what `calories`/`proteinG`/etc. are *for*,
   *  and what lets the result convert into the per-100g figures
   *  NutritionFood actually stores (see toPer100Draft in the nutrition
   *  feature). `portionDescription` is the human-readable twin of this. */
  portionGrams: z.number().min(1).max(3000),
  calories: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(500),
  /** 0–1. How sure the model is about this reading of the photo. */
  confidence: z.number().min(0).max(1),
  advice: z.array(z.string().trim().min(1).max(200)).max(3),
});

/** The result the food form is pre-filled from — editable, never auto-saved. */
export type FoodAnalysis = z.infer<typeof foodAnalysisSchema>;

/**
 * Hand-written rather than derived from the zod schema — Gemini's
 * `responseJsonSchema` accepts a plain JSON Schema object, and zod's own
 * bounds (`.min`, `.max`) don't survive a generic conversion. The zod schema
 * above is what actually enforces them, on the way back out; this is only
 * what steers the model there in the first place.
 */
export const FOOD_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isFood",
    "name",
    "portionDescription",
    "portionGrams",
    "calories",
    "proteinG",
    "fatG",
    "carbsG",
    "confidence",
    "advice",
  ],
  properties: {
    isFood: { type: "boolean", description: "false, если на фото не еда." },
    name: { type: "string", description: "Название блюда." },
    portionDescription: {
      type: "string",
      description: "Оценка размера порции словами, например «одна тарелка, ~350 г».",
    },
    portionGrams: {
      type: "number",
      description: "Та же оценка порции, числом в граммах — например 350.",
    },
    calories: { type: "number", description: "Калории на всю порцию, изображённую на фото." },
    proteinG: { type: "number", description: "Белки в граммах на всю порцию." },
    fatG: { type: "number", description: "Жиры в граммах на всю порцию." },
    carbsG: { type: "number", description: "Углеводы в граммах на всю порцию." },
    confidence: { type: "number", description: "Уверенность анализа, от 0 до 1." },
    advice: {
      type: "array",
      description: "До трёх коротких советов по этому приёму пищи.",
      items: { type: "string" },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Appearance-photo analysis
// ---------------------------------------------------------------------------

export const appearanceAnalysisSchema = z.object({
  isAnalyzable: z.boolean(),
  strengths: z.array(z.string().trim().min(1).max(200)).max(5),
  weaknesses: z.array(z.string().trim().min(1).max(200)).max(5),
  recommendations: z.array(z.string().trim().min(1).max(200)).max(5),
  care: z.array(z.string().trim().min(1).max(200)).max(5),
  style: z.array(z.string().trim().min(1).max(200)).max(5),
  /** 0–1. How sure the model is about this reading of the photo. */
  confidence: z.number().min(0).max(1),
});

export type AppearanceAnalysis = z.infer<typeof appearanceAnalysisSchema>;

export const APPEARANCE_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "isAnalyzable",
    "strengths",
    "weaknesses",
    "recommendations",
    "care",
    "style",
    "confidence",
  ],
  properties: {
    isAnalyzable: {
      type: "boolean",
      description: "false, если на фото не видно лицо/тело достаточно чётко.",
    },
    strengths: {
      type: "array",
      description: "До пяти сильных сторон, конкретно по фото.",
      items: { type: "string" },
    },
    weaknesses: {
      type: "array",
      description: "До пяти сторон, над которыми стоит поработать, сформулированных конструктивно.",
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      description: "До пяти общих направлений действий.",
      items: { type: "string" },
    },
    care: {
      type: "array",
      description: "До пяти рекомендаций по уходу — только регулярность и привычка, без брендов и веществ.",
      items: { type: "string" },
    },
    style: {
      type: "array",
      description: "До пяти заметок про образ, причёску, стиль.",
      items: { type: "string" },
    },
    confidence: { type: "number", description: "Уверенность анализа, от 0 до 1." },
  },
} as const;
