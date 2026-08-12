/**
 * Turning a body into a daily calorie and macro target.
 *
 * This file is the answer to the section's worst defect: the app knew the
 * user's age, height, weight and sex from onboarding, and then asked them to
 * type their own calorie goal into a box with the placeholder "2000". Someone
 * who already knows their number did not need the app; someone who did not know
 * it — most people — got an empty progress bar that could never fill.
 *
 * Mifflin–St Jeor, because it is the formula with the best measured accuracy for
 * the general population and the one every clinical calculator has defaulted to
 * since 2005. Katch–McArdle would be more accurate, but it needs body-fat
 * percentage, which this app cannot measure and should not ask a person to
 * guess.
 *
 * EVERY NUMBER HERE IS AN ESTIMATE, and the UI says so. Real expenditure varies
 * by ±10% between two people with identical inputs. The target is a starting
 * point to adjust from after two weeks of real weight data, not a prescription.
 */

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "athlete",
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/**
 * The Harris–Benedict activity multipliers, unchanged since they are the ones
 * the formula was validated against.
 */
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

/**
 * Described by what the week looks like rather than by a word like "умеренная",
 * which two people will read three different ways. The number of training
 * sessions is the thing a person can actually count about themselves.
 */
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Сидячий образ жизни",
  light: "Лёгкая активность",
  moderate: "Умеренная активность",
  active: "Высокая активность",
  athlete: "Очень высокая",
};

export const ACTIVITY_HINTS: Record<ActivityLevel, string> = {
  sedentary: "Офис, мало хожу, тренировок нет",
  light: "1–2 тренировки в неделю или много хожу",
  moderate: "3–4 тренировки в неделю",
  active: "5–6 тренировок в неделю",
  athlete: "Каждый день или физическая работа",
};

export const ACTIVITY_OPTIONS = ACTIVITY_LEVELS.map((value) => ({
  value,
  label: ACTIVITY_LABELS[value],
  hint: ACTIVITY_HINTS[value],
}));

/** What the user is trying to do with their weight. */
export const NUTRITION_AIMS = ["lose", "maintain", "gain"] as const;
export type NutritionAim = (typeof NUTRITION_AIMS)[number];

export const AIM_LABELS: Record<NutritionAim, string> = {
  lose: "Снизить вес",
  maintain: "Удержать вес",
  gain: "Набрать массу",
};

/**
 * The calorie offset per aim.
 *
 * A percentage of maintenance rather than a flat ±500 kcal: 500 is a fifth of a
 * small woman's intake and a seventh of a large man's, so a flat number is a
 * mild deficit for one person and a crash diet for another. 15% is the band that
 * loses roughly 0.5 kg a week without the muscle loss and adherence collapse
 * that steeper cuts produce.
 */
const AIM_FACTOR: Record<NutritionAim, number> = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
};

/**
 * A floor no computed target is allowed to fall below, by sex.
 *
 * Mifflin plus a 15% cut can produce a number in the low 1000s for a small,
 * sedentary person, and shipping that as a recommendation would be actively
 * harmful. These are the widely used clinical minimums for unsupervised dieting.
 */
const CALORIE_FLOOR: Record<"male" | "female" | "other", number> = {
  male: 1500,
  female: 1200,
  other: 1300,
};

export interface BodyInput {
  age: number;
  heightCm: number;
  weightKg: number;
  gender: string;
  activity: ActivityLevel;
  aim: NutritionAim;
}

export interface NutritionTargets {
  /** Basal metabolic rate — what the body burns at complete rest. */
  bmr: number;
  /** Total daily energy expenditure — BMR scaled by activity. */
  tdee: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
  /** True when the aim's deficit was overridden by the safety floor. */
  wasFloored: boolean;
}

/** Mifflin–St Jeor. The `other` case takes the midpoint of the two constants. */
export function basalMetabolicRate(input: {
  age: number;
  heightCm: number;
  weightKg: number;
  gender: string;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;

  if (input.gender === "male") return Math.round(base + 5);
  if (input.gender === "female") return Math.round(base - 161);
  // Neither constant is right for a person who is neither, and picking one
  // silently would be worse than splitting the difference and saying so.
  return Math.round(base - 78);
}

/**
 * Protein per kg of bodyweight, per aim.
 *
 * Highest while cutting, which is the counterintuitive part and the reason it
 * is a table rather than a constant: in a deficit, protein is what decides
 * whether the weight lost is fat or muscle.
 */
const PROTEIN_PER_KG: Record<NutritionAim, number> = {
  lose: 2,
  maintain: 1.6,
  gain: 1.8,
};

/** Fat as a share of total calories. Below ~20% hormone production suffers. */
const FAT_SHARE = 0.27;

/** Millilitres of water per kg of bodyweight. */
const WATER_PER_KG = 33;

/**
 * Расход за сутки — BMR, умноженный на активность.
 *
 * Вынесено из calculateTargets отдельной функцией, потому что у него появился
 * второй потребитель: inferAim сравнивает норму именно с поддержанием, и без
 * этой функции ему пришлось бы либо считать полный набор целей ради одного
 * числа, либо получить доступ к таблице коэффициентов, которая обязана
 * остаться приватной.
 */
export function totalDailyEnergyExpenditure(input: {
  age: number;
  heightCm: number;
  weightKg: number;
  gender: string;
  activity: ActivityLevel;
}): number {
  return Math.round(basalMetabolicRate(input) * ACTIVITY_FACTOR[input.activity]);
}

/**
 * Какую цель человек фактически преследует, судя по его норме.
 *
 * ПОЧЕМУ ЭТО ВЫВОДИТСЯ, А НЕ ХРАНИТСЯ. `aim` спрашивают один раз в онбординге и
 * нигде не сохраняют — он только выбирает коэффициент для первой нормы, после
 * чего источником истины становится сама норма (см. комментарий к полю в
 * onboardingProfileSchema и к созданию NutritionGoal в completeOnboarding).
 * Завести колонку означало бы завести второй ответ на тот же вопрос: человек,
 * поднявший норму до профицита руками, по колонке продолжал бы худеть.
 *
 * Порог в 5% от поддержания, а не точное сравнение: норма округляется, вес в
 * профиле целочисленный, и разница в полсотни килокалорий не является выбором
 * цели. Всё, что ближе — поддержание.
 *
 * `null` в ответ на нулевую или неправдоподобную норму: это «цель неизвестна», и
 * показывать по такому основанию сценарий похудения нельзя.
 */
export function inferAim(caloriesGoal: number, tdee: number): NutritionAim | null {
  if (caloriesGoal <= 0 || tdee <= 0) return null;

  const ratio = caloriesGoal / tdee;
  if (ratio < 0.95) return "lose";
  if (ratio > 1.05) return "gain";
  return "maintain";
}

export function calculateTargets(input: BodyInput): NutritionTargets {
  const bmr = basalMetabolicRate(input);
  const tdee = totalDailyEnergyExpenditure(input);

  const aimed = Math.round(tdee * AIM_FACTOR[input.aim]);
  const floor =
    CALORIE_FLOOR[input.gender === "male" || input.gender === "female" ? input.gender : "other"];
  const calories = Math.max(floor, aimed);

  const proteinG = Math.round(input.weightKg * PROTEIN_PER_KG[input.aim]);
  const fatG = Math.round((calories * FAT_SHARE) / 9);
  // Carbs take whatever is left, which is what makes the three macros actually
  // add up to the calorie target instead of being three independent guesses.
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return {
    bmr,
    tdee,
    calories,
    proteinG,
    fatG,
    carbsG,
    waterMl: Math.round((input.weightKg * WATER_PER_KG) / 50) * 50,
    wasFloored: calories > aimed,
  };
}
