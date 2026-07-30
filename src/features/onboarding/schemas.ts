import { z } from "zod";
import { DEFAULT_THEME, THEME_VALUES } from "@/shared/config/themes";

export const GENDER_VALUES = ["male", "female", "other"] as const;
export type GenderValue = (typeof GENDER_VALUES)[number];
export const GENDER_LABELS: Record<GenderValue, string> = {
  male: "Мужской",
  female: "Женский",
  other: "Другое",
};
export const GENDER_OPTIONS = GENDER_VALUES.map((value) => ({
  value,
  label: GENDER_LABELS[value],
}));

export const PRIMARY_GOAL_VALUES = [
  "productivity",
  "health",
  "mindfulness",
  "finance",
  "all_in_one",
] as const;
export type PrimaryGoalValue = (typeof PRIMARY_GOAL_VALUES)[number];
export const PRIMARY_GOAL_LABELS: Record<PrimaryGoalValue, string> = {
  productivity: "Продуктивность",
  health: "Здоровье и фитнес",
  mindfulness: "Осознанность",
  finance: "Финансы",
  all_in_one: "Все сферы жизни",
};
export const PRIMARY_GOAL_OPTIONS = PRIMARY_GOAL_VALUES.map((value) => ({
  value,
  label: PRIMARY_GOAL_LABELS[value],
}));

export const OCCUPATION_VALUES = [
  "student",
  "employee",
  "entrepreneur",
  "freelancer",
  "other",
] as const;
export type OccupationValue = (typeof OCCUPATION_VALUES)[number];
export const OCCUPATION_LABELS: Record<OccupationValue, string> = {
  student: "Учусь",
  employee: "Работаю по найму",
  entrepreneur: "Веду бизнес",
  freelancer: "Фриланс",
  other: "Другое",
};
export const OCCUPATION_OPTIONS = OCCUPATION_VALUES.map((value) => ({
  value,
  label: OCCUPATION_LABELS[value],
}));

export const onboardingProfileSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(60, "Слишком длинное имя"),
  age: z.coerce.number().int().min(10, "Минимум 10 лет").max(120, "Максимум 120 лет"),
  heightCm: z.coerce
    .number()
    .int()
    .min(80, "Минимум 80 см")
    .max(250, "Максимум 250 см"),
  weightKg: z.coerce
    .number()
    .int()
    .min(20, "Минимум 20 кг")
    .max(300, "Максимум 300 кг"),
  gender: z.enum(GENDER_VALUES),
  primaryGoal: z.enum(PRIMARY_GOAL_VALUES),
  occupation: z.enum(OCCUPATION_VALUES),
  timezone: z.string().min(1, "Выберите часовой пояс"),
  // Not a question the flow asks. Every profile is created on Nova Blue and
  // the user re-picks it later in Профиль → Внешний вид, so the value is
  // carried silently with a default instead of gating completion on it.
  themeColor: z.enum(THEME_VALUES).default(DEFAULT_THEME),
});

export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
