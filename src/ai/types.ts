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

// The union of AI surfaces used to live here, beside the shared counter it was
// for. Both moved to features/usage (UsageFeature in its constants.ts), which
// is where the limits, the counters and the labels now are — one name for a
// feature rather than one in the AI layer and another in the product layer.

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

/**
 * What the photo is *of*, as chosen by the user before they shot it.
 *
 * Declared here rather than imported from features/appearance so the AI layer
 * keeps its own vocabulary and does not depend upwards — the same reason the
 * food and coach schemas restate what they need. The two lists are kept in step
 * by appearanceSubjectSchema, which the action parses its input through.
 *
 * This exists because the section used to collect an area, store it on the row,
 * and then never tell the model — so a body photo was read by a prompt that
 * only knew how to describe a face, found none, and reported the picture as
 * unreadable. The subject is the fix: it decides which rules apply.
 */
export const APPEARANCE_SUBJECTS = [
  "skin",
  "hair",
  "teeth",
  "body",
  "beard",
  "nails",
  "custom",
] as const;

export type AppearanceSubject = (typeof APPEARANCE_SUBJECTS)[number];

export const appearanceSubjectSchema = z.enum(APPEARANCE_SUBJECTS);

/** What the model is told the photo shows, per subject. */
export const APPEARANCE_SUBJECT_BRIEF: Record<AppearanceSubject, string> = {
  skin: "лицо и состояние кожи",
  hair: "волосы и причёска",
  teeth: "зубы и улыбка",
  body: "телосложение и осанка",
  beard: "борода и её форма",
  nails: "ногти и руки",
  custom: "внешность в целом",
};

/**
 * Facial structure, read descriptively.
 *
 * The point of this block is that a styling recommendation has to be grounded
 * in something: "боковой пробор" is noise on its own and useful once it
 * follows from an observed face shape. So these are neutral descriptors a
 * stylist would use — never a rating, never a comparison to anyone else, and
 * never a judgement about the person. The prompt holds that line; the schema
 * just gives it somewhere to put the answer.
 */
export const appearanceFaceSchema = z.object({
  /** "Овальная, с мягкой линией челюсти." */
  shape: z.string().trim().max(200),
  /** Balance of the upper/middle/lower thirds. */
  proportions: z.string().trim().max(200),
  /** Stated as an observation, not a defect — near-perfect symmetry is rare. */
  symmetry: z.string().trim().max(200),
  /** Eyes, brows, nose, lips, jaw, cheekbones — one observation each. */
  features: z.array(z.string().trim().min(1).max(200)).max(6),
});

export type AppearanceFace = z.infer<typeof appearanceFaceSchema>;

/** How a single observed zone is doing — drives the chip colour in the UI. */
export const APPEARANCE_ZONE_STATES = ["good", "neutral", "attention"] as const;
export type AppearanceZoneState = (typeof APPEARANCE_ZONE_STATES)[number];

/**
 * A per-area reading: T-зона, под глазами, щёки, волосы, борода.
 *
 * Free-form `zone` rather than a fixed union — what is worth commenting on
 * depends entirely on the photo, and a closed list would either be too long to
 * steer the model with or would silently drop the interesting observation.
 */
export const appearanceZoneSchema = z.object({
  zone: z.string().trim().min(1).max(60),
  state: z.enum(APPEARANCE_ZONE_STATES),
  note: z.string().trim().min(1).max(200),
});

export type AppearanceZone = z.infer<typeof appearanceZoneSchema>;

export const appearanceAnalysisSchema = z.object({
  isAnalyzable: z.boolean(),
  face: appearanceFaceSchema,
  zones: z.array(appearanceZoneSchema).max(8),
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
    "face",
    "zones",
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
    face: {
      type: "object",
      description:
        "Описание черт лица. Если лицо не видно — пустые строки и пустой список.",
      additionalProperties: false,
      required: ["shape", "proportions", "symmetry", "features"],
      properties: {
        shape: {
          type: "string",
          description:
            "Форма лица нейтральным описанием: овальная, круглая, квадратная, вытянутая, сердцевидная, ромбовидная — и линия челюсти.",
        },
        proportions: {
          type: "string",
          description:
            "Соотношение верхней, средней и нижней третей лица — что длиннее, что короче, насколько сбалансировано.",
        },
        symmetry: {
          type: "string",
          description:
            "Наблюдение о симметрии. Полная симметрия — редкость, пиши это как факт, а не как недостаток.",
        },
        features: {
          type: "array",
          description:
            "До шести наблюдений о конкретных чертах: глаза, брови, нос, губы, скулы, линия челюсти. По одному наблюдению на черту.",
          items: { type: "string" },
        },
      },
    },
    zones: {
      type: "array",
      description:
        "До восьми зон, разобранных по отдельности: T-зона, щёки, под глазами, губы, волосы, борода. Только то, что реально видно на фото.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["zone", "state", "note"],
        properties: {
          zone: { type: "string", description: "Название зоны, например «под глазами»." },
          state: {
            type: "string",
            enum: ["good", "neutral", "attention"],
            description:
              "good — зона в хорошем состоянии; neutral — норма без замечаний; attention — стоит поработать.",
          },
          note: { type: "string", description: "Одно конкретное наблюдение по этой зоне." },
        },
      },
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
      description:
        "До пяти действий. Каждое — одной фразой по форме «что видно на фото → что делать → как часто или за какой срок». Совет, который подошёл бы любому человеку с любой фотографией, не включать; лучше меньше пунктов.",
      items: { type: "string" },
    },
    care: {
      type: "array",
      description:
        "До пяти пунктов ухода: конкретное действие, частота и зона, к которой оно относится. Без брендов, действующих веществ и процедур со специалистом — и без пустых формул вроде «регулярно очищайте кожу».",
      items: { type: "string" },
    },
    style: {
      type: "array",
      description:
        "До пяти правок образа — причёска, брови, растительность, посадка одежды, силуэт. Каждая называет наблюдение с фото и правку, которая из него следует.",
      items: { type: "string" },
    },
    confidence: { type: "number", description: "Уверенность анализа, от 0 до 1." },
  },
} as const;
