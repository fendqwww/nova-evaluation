/**
 * Which palette the app paints itself in.
 *
 * A different axis from ThemeValue (shared/config/themes), which picks the
 * accent *hue*: this decides light against dark, that decides which of six
 * colours the accents are. "system" defers to the device and keeps deferring —
 * it is resolved on every change of the media query, not once at load.
 */
export type ThemeMode = "light" | "dark" | "system";

/** The interface language. Only "ru" is translated today; see LANGUAGE_READY. */
export type LanguageCode = "ru" | "en";

/**
 * How a date is written out.
 *
 * Display only. Days are stored and compared as CalendarDay strings whatever
 * this says — the format never reaches a column, which is what keeps changing
 * it from being a data migration.
 */
export type DateFormat = "dmy" | "mdy" | "iso";

/** Metric or imperial. Display only, for the same reason as DateFormat. */
export type UnitSystem = "metric" | "imperial";

/** Which subscription tier the account is on. No billing writes it yet. */
export type PlanId = "free" | "plus" | "max";

/**
 * The per-section notification switches.
 *
 * Storage only: nothing schedules or sends anything yet. Kept as six explicit
 * booleans rather than a set of enabled section names because that is what the
 * columns are, and because "which sections may notify me" is a question with a
 * fixed, known list of answers — a free-form set would let an unknown section
 * name be stored and silently ignored.
 */
export interface NotificationSettings {
  habits: boolean;
  tasks: boolean;
  nutrition: boolean;
  workouts: boolean;
  appearance: boolean;
  coach: boolean;
}

export type NotificationChannel = keyof NotificationSettings;

/**
 * What the user has allowed the AI side of the app to do.
 *
 * `coachEnabled` is enforced server-side (see get-coach-overview.action.ts) —
 * turning it off actually stops the Coach answering rather than only hiding a
 * tab. `dailyReport` is enforced too: it gates the model-written daily briefing
 * (see generate-daily-brief.action.ts). `vision` gates the two photo-analysis
 * actions (analyze-food-photo, analyze-appearance-photo) — off means the
 * camera button still opens, but nothing is sent to Gemini.
 *
 * `vision` is independent of `coachEnabled` on purpose: reading a plate of
 * food is not the Coach talking, and someone who wants macros estimated
 * without a coach reading their day is a coherent position to hold.
 */
export interface AiSettings {
  coachEnabled: boolean;
  dailyReport: boolean;
  vision: boolean;
}

/**
 * Everything that lives in the UserSettings row, resolved.
 *
 * Never partial and never null: a user with no row reads DEFAULT_SETTINGS, so
 * every consumer gets the same shape whether or not this screen was ever
 * opened. Unknown column values (a hand-edited row, a value written by a newer
 * version) fall back to the default for that field rather than making the
 * screen unreadable — the same policy every other repository in the app applies
 * to its plain-string categorical columns.
 */
export interface UserSettingsItem {
  themeMode: ThemeMode;
  language: LanguageCode;
  dateFormat: DateFormat;
  unitSystem: UnitSystem;
  notifications: NotificationSettings;
  ai: AiSettings;
  plan: PlanId;
}

/**
 * The account card at the top of the screen.
 *
 * Read from User and Profile rather than stored here — this is a view of who
 * you are, not a setting. Editing any of it is the Profile section's job; this
 * screen shows it and links there, which is why every field is display-ready
 * and nothing is a draft.
 */
export interface SettingsAccount {
  name: string;
  telegramName: string;
  username: string | null;
  photoUrl: string | null;
  /** IANA zone, the authority for every calendar day in the app. */
  timezone: string;
  /** ISO instant the account was created. */
  createdAt: string;
  onboardingCompleted: boolean;
}

/**
 * Where the shared AI budget stands (see ai/limits.ts) — the same lifetime
 * counter Coach, food-photo and appearance-photo analysis all spend from.
 * `limit` is null for PLUS/MAX, which the display reads as "без ограничений"
 * rather than as a hidden ceiling.
 */
export interface AiUsageStatus {
  used: number;
  limit: number | null;
}

/** One fetch of the Настройки screen. */
export interface SettingsSnapshot {
  account: SettingsAccount;
  settings: UserSettingsItem;
  /** How much there is to restore, per kind — the badge on "Архив". */
  archiveCount: number;
  aiUsage: AiUsageStatus;
}

/**
 * Which section an archived row came from.
 *
 * The archive is a cross-section view: four different tables archive rows for
 * the same reason (a thing you stopped doing still happened), and until now
 * each one was only reachable from inside its own screen. The kind is what
 * lets one list restore into four tables without a switch statement leaking
 * into the UI.
 */
export type ArchiveKind = "habit" | "workout" | "food" | "routine";

export interface ArchiveItem {
  id: string;
  kind: ArchiveKind;
  title: string;
  /** ISO instant it was archived. */
  archivedAt: string;
  /** Section-specific one-liner — category, macros, schedule. */
  detail: string | null;
}

/**
 * What "очистить данные" can be pointed at.
 *
 * Deliberately per-section rather than one "delete everything" button: the
 * realistic reason to clear anything is that one section's history has gone
 * wrong, and an all-or-nothing control makes the user choose between living
 * with it and losing the other five sections too.
 */
export type ClearScope =
  | "coach"
  | "nutrition"
  | "workouts"
  | "appearancePhotos"
  | "habitLogs"
  | "completedTasks";

/** How many rows a clear actually removed — what the confirmation reports. */
export interface ClearResult {
  scope: ClearScope;
  removed: number;
}

/**
 * The export payload.
 *
 * A plain JSON document assembled server-side, handed to the client as a
 * string. It is the user's own data in a form they can read and keep, not a
 * backup format the app can restore from — nothing imports this, and the UI
 * says so rather than implying a round trip that does not exist.
 */
export interface ExportBundle {
  /** Bumped when the shape changes, so an old file is still identifiable. */
  version: number;
  /** ISO instant the export was produced. */
  exportedAt: string;
  json: string;
  /** Suggested filename, resolved server-side so it carries the real date. */
  filename: string;
  /** Byte length of `json`, for the "≈120 КБ" hint before downloading. */
  sizeBytes: number;
}
