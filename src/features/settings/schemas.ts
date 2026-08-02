import { z } from "zod";
import type {
  ArchiveKind,
  ClearScope,
  DateFormat,
  LanguageCode,
  NotificationChannel,
  PlanId,
  ThemeMode,
  UnitSystem,
} from "@/features/settings/types";

/**
 * The unions behind every categorical column in UserSettings.
 *
 * Declared as `as const satisfies readonly T[]` so the value list and the type
 * cannot drift apart — adding a member to one without the other stops the
 * build, which is the whole reason these are not bare z.enum literals.
 */
export const THEME_MODES = ["light", "dark", "system"] as const satisfies readonly ThemeMode[];
export const themeModeSchema = z.enum(THEME_MODES);

export const LANGUAGES = ["ru", "en"] as const satisfies readonly LanguageCode[];
export const languageSchema = z.enum(LANGUAGES);

export const DATE_FORMATS = ["dmy", "mdy", "iso"] as const satisfies readonly DateFormat[];
export const dateFormatSchema = z.enum(DATE_FORMATS);

export const UNIT_SYSTEMS = ["metric", "imperial"] as const satisfies readonly UnitSystem[];
export const unitSystemSchema = z.enum(UNIT_SYSTEMS);

export const PLANS = ["free", "plus", "max"] as const satisfies readonly PlanId[];
export const planSchema = z.enum(PLANS);

export const NOTIFICATION_CHANNELS = [
  "habits",
  "tasks",
  "nutrition",
  "workouts",
  "appearance",
  "coach",
] as const satisfies readonly NotificationChannel[];

export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

export const ARCHIVE_KINDS = [
  "habit",
  "workout",
  "food",
  "routine",
] as const satisfies readonly ArchiveKind[];

export const archiveKindSchema = z.enum(ARCHIVE_KINDS);

export const CLEAR_SCOPES = [
  "coach",
  "nutrition",
  "workouts",
  "appearancePhotos",
  "habitLogs",
  "completedTasks",
] as const satisfies readonly ClearScope[];

export const clearScopeSchema = z.enum(CLEAR_SCOPES);

/**
 * A timezone as the region picker sends it.
 *
 * Validated against Intl rather than against a hardcoded list: the picker
 * offers a curated set (lib/timezones.ts), but the column is the authority for
 * every calendar day in the app, so what actually matters is that the value is
 * one Intl can resolve. A zone that throws here would otherwise reach
 * todayIn(), which silently falls back to UTC — a habit streak quietly measured
 * in the wrong day is a much worse failure than a rejected form.
 */
export const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Выберите часовой пояс")
  .max(64, "Некорректный часовой пояс")
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Некорректный часовой пояс");

/**
 * The whole Регион group, written together.
 *
 * One draft rather than four single-field actions because the picker modal
 * saves once on close: four round trips for one screen of choices would be
 * four chances to end up half-applied.
 */
export const regionDraftSchema = z.object({
  language: languageSchema,
  timezone: timezoneSchema,
  dateFormat: dateFormatSchema,
  unitSystem: unitSystemSchema,
});

export type RegionDraft = z.infer<typeof regionDraftSchema>;

export const notificationsDraftSchema = z.object({
  habits: z.boolean(),
  tasks: z.boolean(),
  nutrition: z.boolean(),
  workouts: z.boolean(),
  appearance: z.boolean(),
  coach: z.boolean(),
});

export type NotificationsDraft = z.infer<typeof notificationsDraftSchema>;

export const aiDraftSchema = z.object({
  coachEnabled: z.boolean(),
  dailyReport: z.boolean(),
  vision: z.boolean(),
});

export type AiDraft = z.infer<typeof aiDraftSchema>;

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: "Светлая",
  dark: "Тёмная",
  system: "Системная",
};

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  ru: "Русский",
  en: "English",
};

/**
 * Which locales are actually translated.
 *
 * Every string in the app is Russian today. The picker still *offers* English
 * and stores the choice, but marks it as unavailable rather than switching to
 * it — a language setting that silently leaves the interface in Russian is a
 * broken promise, and hiding the option entirely would lose the fact that the
 * column and the plumbing are already there.
 */
export const LANGUAGE_READY: Record<LanguageCode, boolean> = {
  ru: true,
  en: false,
};

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  dmy: "31.12.2026",
  mdy: "12/31/2026",
  iso: "2026-12-31",
};

export const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = {
  metric: "Метрическая",
  imperial: "Имперская",
};

export const UNIT_SYSTEM_HINTS: Record<UnitSystem, string> = {
  metric: "кг, см, км, мл",
  imperial: "фунты, футы, мили, унции",
};

export const NOTIFICATION_LABELS: Record<NotificationChannel, string> = {
  habits: "Привычки",
  tasks: "Задачи",
  nutrition: "Питание",
  workouts: "Тренировки",
  appearance: "Внешность",
  coach: "AI Coach",
};

export const NOTIFICATION_HINTS: Record<NotificationChannel, string> = {
  habits: "Напоминание отметить привычки дня",
  tasks: "Задачи с дедлайном сегодня",
  nutrition: "Напоминание записать приём пищи",
  workouts: "Тренировка по плану на сегодня",
  appearance: "Утренний и вечерний уход",
  coach: "Ежедневный разбор от Nova",
};

export const ARCHIVE_KIND_LABELS: Record<ArchiveKind, string> = {
  habit: "Привычка",
  workout: "Тренировка",
  food: "Продукт",
  routine: "Уход",
};

export const CLEAR_SCOPE_LABELS: Record<ClearScope, string> = {
  coach: "Переписка с AI Coach",
  nutrition: "Дневник питания",
  workouts: "История тренировок",
  appearancePhotos: "Фото прогресса",
  habitLogs: "Отметки привычек",
  completedTasks: "Выполненные задачи",
};

/**
 * What each clear actually removes, in the user's words.
 *
 * Spelled out per scope rather than left to a generic "все данные раздела"
 * because these are irreversible and the boundary matters: clearing the diary
 * keeps the food catalogue, clearing sessions keeps the workout plans. A user
 * who does not know that will not press the button, and a user who assumes the
 * opposite will press it once and regret it.
 */
export const CLEAR_SCOPE_HINTS: Record<ClearScope, string> = {
  coach: "Все сообщения. Сам коуч и анализ останутся — он считает их заново.",
  nutrition: "Все записи о еде и воде. Продукты и шаблоны останутся.",
  workouts: "Все проведённые сессии и подходы. Программы останутся.",
  appearancePhotos: "Все фото прогресса. Процедуры и цели останутся.",
  habitLogs: "Вся история отметок. Сами привычки останутся, стрики обнулятся.",
  completedTasks: "Только выполненные задачи. Активные останутся.",
};
