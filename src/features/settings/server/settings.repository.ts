import "server-only";
import { db } from "@/server/db";
import { dateToDay } from "@/shared/lib/calendar-day";
import {
  DATE_FORMATS,
  LANGUAGES,
  PLANS,
  THEME_MODES,
  UNIT_SYSTEMS,
} from "@/features/settings/schemas";
import type {
  AiSettings,
  ArchiveItem,
  ArchiveKind,
  ClearScope,
  DateFormat,
  LanguageCode,
  NotificationSettings,
  PlanId,
  ThemeMode,
  UnitSystem,
  UserSettingsItem,
} from "@/features/settings/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate "does
 * this belong to you?" check a future caller could forget. Same convention as
 * appearance.repository.ts and nutrition.repository.ts.
 *
 * Two things make this repository different from the section ones:
 *
 *   1. It reaches across sections. The archive reads four tables and the
 *      export reads all of them, because "всё, что вы внесли" is a question no
 *      single section can answer. It reads through Prisma directly rather than
 *      calling the other repositories: those shape rows for their own screens
 *      (windowed logs, derived schedules, thumbnails), and an export wants the
 *      stored facts, not another screen's view of them.
 *   2. It deletes. clearScope is the only place in the app that removes rows a
 *      user did not individually create, so each scope is spelled out
 *      explicitly and none of them cascades further than its name promises.
 */

// ---------------------------------------------------------------------------
// The settings row
// ---------------------------------------------------------------------------

/**
 * What a user who has never touched this screen behaves like.
 *
 * Must stay identical to the @default values on UserSettings in schema.prisma:
 * the row is created lazily, so these defaults and the column defaults are two
 * halves of the same promise, and a user who saves one unrelated switch must
 * not silently acquire a different set of defaults for everything else.
 */
export const DEFAULT_SETTINGS: UserSettingsItem = {
  themeMode: "system",
  language: "ru",
  dateFormat: "dmy",
  unitSystem: "metric",
  notifications: {
    habits: true,
    tasks: true,
    nutrition: false,
    workouts: true,
    appearance: false,
    coach: true,
  },
  ai: {
    coachEnabled: true,
    dailyReport: true,
    vision: false,
  },
  plan: "free",
};

/**
 * A stored string back into its union, or the default if it is not one.
 *
 * These are plain columns (SQLite has no enums), so an unrecognised value must
 * degrade to something renderable rather than throw — the same policy
 * toSchedule applies in appearance.repository.ts. A settings screen that
 * refuses to load is a settings screen you cannot use to fix the value.
 */
function toUnion<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

interface SettingsRow {
  themeMode: string;
  language: string;
  dateFormat: string;
  unitSystem: string;
  notifyHabits: boolean;
  notifyTasks: boolean;
  notifyNutrition: boolean;
  notifyWorkouts: boolean;
  notifyAppearance: boolean;
  notifyCoach: boolean;
  aiCoachEnabled: boolean;
  aiDailyReport: boolean;
  aiVisionEnabled: boolean;
  plan: string;
}

function toSettingsItem(row: SettingsRow): UserSettingsItem {
  return {
    themeMode: toUnion<ThemeMode>(row.themeMode, THEME_MODES, DEFAULT_SETTINGS.themeMode),
    language: toUnion<LanguageCode>(row.language, LANGUAGES, DEFAULT_SETTINGS.language),
    dateFormat: toUnion<DateFormat>(row.dateFormat, DATE_FORMATS, DEFAULT_SETTINGS.dateFormat),
    unitSystem: toUnion<UnitSystem>(row.unitSystem, UNIT_SYSTEMS, DEFAULT_SETTINGS.unitSystem),
    notifications: {
      habits: row.notifyHabits,
      tasks: row.notifyTasks,
      nutrition: row.notifyNutrition,
      workouts: row.notifyWorkouts,
      appearance: row.notifyAppearance,
      coach: row.notifyCoach,
    },
    ai: {
      coachEnabled: row.aiCoachEnabled,
      dailyReport: row.aiDailyReport,
      vision: row.aiVisionEnabled,
    },
    plan: toUnion<PlanId>(row.plan, PLANS, DEFAULT_SETTINGS.plan),
  };
}

/** The user's settings, or the defaults if they have never saved any. */
export async function getSettings(userId: string): Promise<UserSettingsItem> {
  const row = await db.userSettings.findUnique({ where: { userId } });
  return row ? toSettingsItem(row) : DEFAULT_SETTINGS;
}

/**
 * Write some columns, creating the row if this is the first save.
 *
 * One upsert helper for all four groups rather than four near-identical ones:
 * the create branch has to supply *only* the changed columns and let Prisma's
 * @default fill the rest, which is exactly what makes a first-ever save of one
 * switch leave the other fifteen at their documented defaults instead of at
 * whatever the client happened to send.
 */
async function writeSettings(
  userId: string,
  data: Partial<SettingsRow>,
): Promise<UserSettingsItem> {
  const row = await db.userSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return toSettingsItem(row);
}

export function setThemeMode(userId: string, themeMode: ThemeMode) {
  return writeSettings(userId, { themeMode });
}

export interface RegionWriteData {
  language: LanguageCode;
  dateFormat: DateFormat;
  unitSystem: UnitSystem;
}

/**
 * The three region columns that live here.
 *
 * The timezone is deliberately not among them — it belongs to Profile, which is
 * what requireUserContext resolves every calendar day from. See setTimezone.
 */
export function setRegion(userId: string, data: RegionWriteData) {
  return writeSettings(userId, data);
}

/**
 * The user's zone, written where the rest of the app already reads it.
 *
 * Profile is the single source of truth for "which day is it for this user", so
 * changing the zone here changes it for habit streaks, workout sessions and the
 * nutrition diary at the same instant. Storing a second copy on UserSettings
 * would let the two disagree, and the disagreement would show up as a streak
 * breaking for no reason.
 *
 * updateMany rather than update: a user whose Profile row does not exist yet
 * (a half-finished onboarding) reports 0 rows instead of throwing.
 */
export async function setTimezone(userId: string, timezone: string): Promise<boolean> {
  const { count } = await db.profile.updateMany({ where: { userId }, data: { timezone } });
  return count > 0;
}

export function setNotifications(userId: string, data: NotificationSettings) {
  return writeSettings(userId, {
    notifyHabits: data.habits,
    notifyTasks: data.tasks,
    notifyNutrition: data.nutrition,
    notifyWorkouts: data.workouts,
    notifyAppearance: data.appearance,
    notifyCoach: data.coach,
  });
}

export function setAi(userId: string, data: AiSettings) {
  return writeSettings(userId, {
    aiCoachEnabled: data.coachEnabled,
    aiDailyReport: data.dailyReport,
    aiVisionEnabled: data.vision,
  });
}

/**
 * Whether the Coach is allowed to answer at all.
 *
 * Its own narrow read rather than a full getSettings so the Coach screen pays
 * for one boolean instead of a row it has no other use for.
 */
export async function isCoachEnabled(userId: string): Promise<boolean> {
  const row = await db.userSettings.findUnique({
    where: { userId },
    select: { aiCoachEnabled: true },
  });
  return row?.aiCoachEnabled ?? DEFAULT_SETTINGS.ai.coachEnabled;
}

/**
 * Send the user back through onboarding.
 *
 * Clears the completion stamp and nothing else. The Profile row stays exactly
 * as it was, which is what lets the flow open with the current answers already
 * filled in (see buildDefaultValues in use-onboarding-flow.ts) rather than as a
 * blank form — and it means abandoning the flow halfway leaves the account
 * intact rather than half-erased. The redirect guard on every screen reads
 * onboardingCompletedAt, so this alone is enough to reroute the app.
 */
export async function restartOnboarding(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { onboardingCompletedAt: null },
  });
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

/**
 * Everything the user has archived, from all four sections that archive.
 *
 * Habits, workouts, foods and care routines each grew an archivedAt for the
 * same reason — a thing you stopped doing still happened, and deleting it would
 * take its history with it — but until now each was only reachable from inside
 * its own screen, and an archived row with no entry point is indistinguishable
 * from a lost one. This is that entry point.
 *
 * Sorted newest-first across sections, so the thing you archived a minute ago
 * by mistake is the first row you see.
 */
/**
 * An archivedAt that the query has already guaranteed is set.
 *
 * Every read below filters on `archivedAt: { not: null }`, but Prisma's types
 * cannot know that, so the column still arrives as `Date | null`. This narrows
 * it in one documented place instead of scattering non-null assertions across
 * four maps — and the epoch fallback is unreachable rather than a real case.
 */
function archivedIso(archivedAt: Date | null): string {
  return (archivedAt ?? new Date(0)).toISOString();
}

export async function listArchive(userId: string): Promise<ArchiveItem[]> {
  const [habits, workouts, foods, routines] = await Promise.all([
    db.habit.findMany({
      where: { userId, archivedAt: { not: null } },
      select: { id: true, title: true, archivedAt: true, frequency: true },
    }),
    db.workout.findMany({
      where: { userId, archivedAt: { not: null } },
      select: { id: true, title: true, archivedAt: true, category: true },
    }),
    db.nutritionFood.findMany({
      where: { userId, archivedAt: { not: null } },
      select: { id: true, name: true, archivedAt: true, caloriesPer100: true },
    }),
    db.appearanceRoutine.findMany({
      where: { userId, archivedAt: { not: null } },
      select: { id: true, title: true, archivedAt: true, category: true },
    }),
  ]);

  const items: ArchiveItem[] = [
    ...habits.map((row) => ({
      id: row.id,
      kind: "habit" as const,
      title: row.title,
      archivedAt: archivedIso(row.archivedAt),
      detail: FREQUENCY_DETAIL[row.frequency] ?? null,
    })),
    ...workouts.map((row) => ({
      id: row.id,
      kind: "workout" as const,
      title: row.title,
      archivedAt: archivedIso(row.archivedAt),
      detail: WORKOUT_CATEGORY_DETAIL[row.category] ?? null,
    })),
    ...foods.map((row) => ({
      id: row.id,
      kind: "food" as const,
      title: row.name,
      archivedAt: archivedIso(row.archivedAt),
      detail: `${Math.round(row.caloriesPer100)} ккал на 100 г`,
    })),
    ...routines.map((row) => ({
      id: row.id,
      kind: "routine" as const,
      title: row.title,
      archivedAt: archivedIso(row.archivedAt),
      detail: CARE_AREA_DETAIL[row.category] ?? null,
    })),
  ];

  return items.sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
}

/**
 * The one-line descriptions, mapped from the raw column values.
 *
 * Plain lookups with a null fallback rather than imports of each section's
 * label maps: those maps are typed against each section's own union, and an
 * unknown string here has to survive as "no detail" rather than as a crash. A
 * missing key is a row that renders without a subtitle, which is fine.
 */
const FREQUENCY_DETAIL: Record<string, string> = {
  daily: "Каждый день",
  weekdays: "По дням недели",
  weekly: "Несколько раз в неделю",
};

const WORKOUT_CATEGORY_DETAIL: Record<string, string> = {
  strength: "Силовая",
  cardio: "Кардио",
  hiit: "HIIT",
  mobility: "Мобильность",
  sport: "Спорт",
  other: "Другое",
};

const CARE_AREA_DETAIL: Record<string, string> = {
  skin: "Кожа",
  hair: "Волосы",
  teeth: "Зубы",
  body: "Тело",
  beard: "Борода",
  nails: "Ногти",
  custom: "Своё",
};

/** How many archived rows there are, for the badge. One count per table. */
export async function countArchived(userId: string): Promise<number> {
  const archived = { userId, archivedAt: { not: null } };

  const counts = await Promise.all([
    db.habit.count({ where: archived }),
    db.workout.count({ where: archived }),
    db.nutritionFood.count({ where: archived }),
    db.appearanceRoutine.count({ where: archived }),
  ]);

  return counts.reduce((total, count) => total + count, 0);
}

/**
 * Put one archived row back.
 *
 * The kind decides the table; the userId in every where-clause is what stops a
 * forged id restoring somebody else's row. Returns false for an id that does
 * not exist or is not the caller's, which the action turns into an error rather
 * than a silent success.
 */
export async function restoreArchived(
  userId: string,
  kind: ArchiveKind,
  id: string,
): Promise<boolean> {
  const where = { id, userId };
  const data = { archivedAt: null };

  switch (kind) {
    case "habit": {
      const { count } = await db.habit.updateMany({ where, data });
      return count > 0;
    }
    case "workout": {
      const { count } = await db.workout.updateMany({ where, data });
      return count > 0;
    }
    case "food": {
      const { count } = await db.nutritionFood.updateMany({ where, data });
      return count > 0;
    }
    case "routine": {
      const { count } = await db.appearanceRoutine.updateMany({ where, data });
      return count > 0;
    }
  }
}

/**
 * Why a permanent delete did or did not happen.
 *
 * Three outcomes rather than a boolean because "нельзя удалить" and "не
 * найдено" need different words on screen: one is a rule the user should
 * understand, the other is an error.
 */
export type DeleteArchivedResult = "deleted" | "not-found" | "in-use";

/** Delete an archived row for good. Only ever reachable from the archive. */
export async function deleteArchived(
  userId: string,
  kind: ArchiveKind,
  id: string,
): Promise<DeleteArchivedResult> {
  const where = { id, userId };

  switch (kind) {
    case "habit": {
      // Logs go with it via onDelete: Cascade.
      const { count } = await db.habit.deleteMany({ where });
      return count > 0 ? "deleted" : "not-found";
    }
    case "workout": {
      // Exercises, sessions and every logged set go with it via Cascade.
      const { count } = await db.workout.deleteMany({ where });
      return count > 0 ? "deleted" : "not-found";
    }
    case "food": {
      // NutritionEntry points at a food with onDelete: Restrict, so a food the
      // user has ever logged cannot be deleted — that is the guarantee that
      // keeps a past diary day naming the food it actually contained. Archiving
      // is the intended end state for those, so this reports the rule instead
      // of forcing the delete through and rewriting history.
      const food = await db.nutritionFood.findFirst({ where, select: { id: true } });
      if (!food) return "not-found";

      const inUse = await db.nutritionEntry.count({ where: { userId, foodId: id } });
      if (inUse > 0) return "in-use";

      // Template lines carry no relation to the food (see the schema note), so
      // nothing cascades them — they are cleared here to avoid leaving a
      // quick-add line pointing at a row that no longer exists.
      await db.nutritionMealTemplateItem.deleteMany({
        where: { foodId: id, template: { userId } },
      });
      const { count } = await db.nutritionFood.deleteMany({ where });
      return count > 0 ? "deleted" : "not-found";
    }
    case "routine": {
      const { count } = await db.appearanceRoutine.deleteMany({ where });
      return count > 0 ? "deleted" : "not-found";
    }
  }
}

// ---------------------------------------------------------------------------
// Clearing history
// ---------------------------------------------------------------------------

/**
 * Remove one section's history, and only that.
 *
 * Each branch is written out rather than driven by a table map, because the
 * boundary of each scope is a product decision and not a mechanical one:
 * clearing the diary keeps the food catalogue, clearing sessions keeps the
 * programmes, clearing habit logs keeps the habits. Those choices are what the
 * confirmation dialog promises (CLEAR_SCOPE_HINTS), and they are enforced here.
 *
 * Returns the number of rows removed, which is what the UI reports back — "0"
 * is a meaningful answer and much better than a success toast for a scope that
 * was already empty.
 */
export async function clearScope(userId: string, scope: ClearScope): Promise<number> {
  switch (scope) {
    case "coach": {
      const { count } = await db.coachMessage.deleteMany({ where: { userId } });
      return count;
    }
    case "nutrition": {
      // Entries and water, not foods or templates — the catalogue is a library
      // the user built, not history.
      const [entries, water] = await db.$transaction([
        db.nutritionEntry.deleteMany({ where: { userId } }),
        db.nutritionWaterLog.deleteMany({ where: { userId } }),
      ]);
      return entries.count + water.count;
    }
    case "workouts": {
      // Sessions only. Sets go with them via onDelete: Cascade; the workouts
      // and their exercises stay, so the plan survives its history.
      const { count } = await db.workoutSession.deleteMany({
        where: { workout: { userId } },
      });
      return count;
    }
    case "appearancePhotos": {
      const { count } = await db.appearancePhoto.deleteMany({ where: { userId } });
      return count;
    }
    case "habitLogs": {
      const { count } = await db.habitLog.deleteMany({ where: { habit: { userId } } });
      return count;
    }
    case "completedTasks": {
      const { count } = await db.task.deleteMany({ where: { userId, isCompleted: true } });
      return count;
    }
  }
}

/** How much each scope currently holds, so the dialog can say "12 записей". */
export async function countScopes(userId: string): Promise<Record<ClearScope, number>> {
  const [coach, entries, water, sessions, photos, habitLogs, tasks] = await Promise.all([
    db.coachMessage.count({ where: { userId } }),
    db.nutritionEntry.count({ where: { userId } }),
    db.nutritionWaterLog.count({ where: { userId } }),
    db.workoutSession.count({ where: { workout: { userId } } }),
    db.appearancePhoto.count({ where: { userId } }),
    db.habitLog.count({ where: { habit: { userId } } }),
    db.task.count({ where: { userId, isCompleted: true } }),
  ]);

  return {
    coach,
    nutrition: entries + water,
    workouts: sessions,
    appearancePhotos: photos,
    habitLogs,
    completedTasks: tasks,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Everything the app stores about one user, as a plain object.
 *
 * Deliberately the *stored* facts rather than any screen's view of them: no
 * derived streaks, no adherence percentages, no Life Score. Those are all
 * recomputable from what is here, and including them would put numbers in the
 * file that go stale the moment a day is un-ticked — the same reason no table
 * in this app stores a cached percentage.
 *
 * Photo bytes are excluded and replaced by their dimensions and a caption. A
 * year of progress photos is tens of megabytes of base64, which turns a file
 * the user wants to keep into one their phone cannot open. The export says so
 * explicitly in `notes` rather than quietly omitting them.
 */
export async function buildExport(userId: string): Promise<Record<string, unknown>> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      createdAt: true,
      onboardingCompletedAt: true,
      profile: true,
    },
  });

  const [
    goals,
    habits,
    tasks,
    workouts,
    foods,
    entries,
    water,
    mealTemplates,
    nutritionGoal,
    routines,
    photos,
    careGoals,
    coachMessages,
    settings,
  ] = await Promise.all([
    db.goal.findMany({ where: { userId }, include: { steps: true } }),
    db.habit.findMany({ where: { userId }, include: { logs: { select: { date: true } } } }),
    db.task.findMany({ where: { userId } }),
    db.workout.findMany({
      where: { userId },
      include: {
        exercises: true,
        sessions: { include: { sets: true } },
      },
    }),
    db.nutritionFood.findMany({ where: { userId } }),
    db.nutritionEntry.findMany({ where: { userId }, include: { food: { select: { name: true } } } }),
    db.nutritionWaterLog.findMany({ where: { userId } }),
    db.nutritionMealTemplate.findMany({ where: { userId }, include: { items: true } }),
    db.nutritionGoal.findUnique({ where: { userId } }),
    db.appearanceRoutine.findMany({
      where: { userId },
      include: {
        steps: { include: { logs: { select: { day: true } } } },
        logs: { select: { day: true } },
      },
    }),
    db.appearancePhoto.findMany({
      where: { userId },
      // Bytes deliberately absent — see the note above.
      select: { id: true, category: true, day: true, note: true, width: true, height: true, createdAt: true },
    }),
    db.appearanceGoal.findMany({ where: { userId } }),
    db.coachMessage.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    getSettings(userId),
  ]);

  return {
    account: {
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    },
    profile: user.profile
      ? {
          name: user.profile.name,
          age: user.profile.age,
          heightCm: user.profile.heightCm,
          weightKg: user.profile.weightKg,
          gender: user.profile.gender,
          primaryGoal: user.profile.primaryGoal,
          occupation: user.profile.occupation,
          timezone: user.profile.timezone,
          themeColor: user.profile.themeColor,
        }
      : null,
    settings,
    goals: goals.map((goal) => ({
      title: goal.title,
      note: goal.note,
      isCompleted: goal.isCompleted,
      completedAt: goal.completedAt?.toISOString() ?? null,
      targetDate: goal.targetDate ? dateToDay(goal.targetDate) : null,
      createdAt: goal.createdAt.toISOString(),
      steps: goal.steps.map((step) => ({ title: step.title, isDone: step.isDone })),
    })),
    habits: habits.map((habit) => ({
      title: habit.title,
      note: habit.note,
      frequency: habit.frequency,
      weekdayMask: habit.weekdayMask,
      timesPerWeek: habit.timesPerWeek,
      archivedAt: habit.archivedAt?.toISOString() ?? null,
      createdAt: habit.createdAt.toISOString(),
      // Days, not instants — the column holds UTC midnight of a local day.
      log: habit.logs.map((entry) => dateToDay(entry.date)).sort(),
    })),
    tasks: tasks.map((task) => ({
      title: task.title,
      note: task.note,
      priority: task.priority,
      isCompleted: task.isCompleted,
      completedAt: task.completedAt?.toISOString() ?? null,
      dueDate: task.dueDate ? dateToDay(task.dueDate) : null,
      createdAt: task.createdAt.toISOString(),
    })),
    workouts: workouts.map((workout) => ({
      title: workout.title,
      note: workout.note,
      category: workout.category,
      weekdayMask: workout.weekdayMask,
      archivedAt: workout.archivedAt?.toISOString() ?? null,
      createdAt: workout.createdAt.toISOString(),
      exercises: workout.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetWeightKg: exercise.targetWeightKg,
        restSeconds: exercise.restSeconds,
        note: exercise.note,
        position: exercise.position,
        archivedAt: exercise.archivedAt?.toISOString() ?? null,
      })),
      sessions: workout.sessions.map((session) => ({
        day: dateToDay(session.day),
        completedAt: session.completedAt?.toISOString() ?? null,
        note: session.note,
        sets: session.sets.map((set) => ({
          exerciseId: set.exerciseId,
          position: set.position,
          reps: set.reps,
          weightKg: set.weightKg,
        })),
      })),
    })),
    nutrition: {
      goal: nutritionGoal
        ? {
            calories: nutritionGoal.calories,
            proteinG: nutritionGoal.proteinG,
            fatG: nutritionGoal.fatG,
            carbsG: nutritionGoal.carbsG,
            waterMl: nutritionGoal.waterMl,
          }
        : null,
      foods: foods.map((food) => ({
        id: food.id,
        name: food.name,
        caloriesPer100: food.caloriesPer100,
        proteinPer100: food.proteinPer100,
        fatPer100: food.fatPer100,
        carbsPer100: food.carbsPer100,
        isFavorite: food.isFavorite,
        archivedAt: food.archivedAt?.toISOString() ?? null,
      })),
      entries: entries.map((entry) => ({
        day: dateToDay(entry.day),
        mealSlot: entry.mealSlot,
        food: entry.food.name,
        amountG: entry.amountG,
      })),
      water: water.map((log) => ({ day: dateToDay(log.day), amountMl: log.amountMl })),
      mealTemplates: mealTemplates.map((template) => ({
        name: template.name,
        mealSlot: template.mealSlot,
        items: template.items.map((item) => ({
          foodId: item.foodId,
          amountG: item.amountG,
          position: item.position,
        })),
      })),
    },
    appearance: {
      routines: routines.map((routine) => ({
        title: routine.title,
        note: routine.note,
        category: routine.category,
        timeOfDay: routine.timeOfDay,
        frequency: routine.frequency,
        weekdayMask: routine.weekdayMask,
        timesPerWeek: routine.timesPerWeek,
        archivedAt: routine.archivedAt?.toISOString() ?? null,
        createdAt: routine.createdAt.toISOString(),
        log: routine.logs.map((entry) => dateToDay(entry.day)).sort(),
        steps: routine.steps.map((step) => ({
          title: step.title,
          position: step.position,
          createdAt: step.createdAt.toISOString(),
          log: step.logs.map((entry) => dateToDay(entry.day)).sort(),
        })),
      })),
      photos: photos.map((photo) => ({
        category: photo.category,
        day: dateToDay(photo.day),
        note: photo.note,
        width: photo.width,
        height: photo.height,
        createdAt: photo.createdAt.toISOString(),
      })),
      goals: careGoals.map((goal) => ({
        title: goal.title,
        note: goal.note,
        category: goal.category,
        targetDate: goal.targetDate ? dateToDay(goal.targetDate) : null,
        isCompleted: goal.isCompleted,
        completedAt: goal.completedAt?.toISOString() ?? null,
        createdAt: goal.createdAt.toISOString(),
      })),
    },
    coach: coachMessages.map((message) => ({
      role: message.role,
      content: message.content,
      day: dateToDay(message.day),
      createdAt: message.createdAt.toISOString(),
    })),
    notes: [
      "Файл содержит данные, которые Nova хранит о вашем аккаунте.",
      "Фото прогресса не включены: экспортируются только их даты, подписи и размеры.",
      "Производные показатели (стрики, Life Score, проценты) не включены — они считаются из этих данных заново.",
      "Импорт этого файла обратно в приложение пока не поддерживается.",
    ],
  };
}
