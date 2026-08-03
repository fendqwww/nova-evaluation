import "server-only";
import { db } from "@/server/db";
import {
  addDays,
  dateToDay,
  dayToDate,
  diffDays,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import { isMealSlot } from "@/features/nutrition/lib/meal-slot";
import {
  quickTemplateFoodDraft,
  type QuickMealTemplate,
} from "@/features/nutrition/lib/quick-templates";
import type {
  MealSlot,
  NutritionEntryItem,
  NutritionFoodItem,
  NutritionGoalItem,
  NutritionMealTemplate,
  NutritionMealTemplateItemInput,
  NutritionWaterItem,
} from "@/features/nutrition/types";

/**
 * Every function here takes the caller's own userId and folds it into the
 * where-clause — ownership is enforced by the query, never by a separate "does
 * this belong to you?" check a future caller could forget. The mutations use
 * updateMany/deleteMany on purpose: Prisma's single-row update needs a unique
 * where, and { id, userId } is not a declared unique pair; the *Many variants
 * accept the compound filter and report 0 affected rows for an id that exists
 * but belongs to somebody else, which is exactly the answer the action needs.
 * Same conventions as workouts.repository.ts and habits.repository.ts.
 */

/**
 * How much diary history travels to the client.
 *
 * Ninety days is long enough for "недельная статистика" to look back a few
 * weeks and for a monthly trend to mean something, short enough that someone
 * logging every meal for years still ships one bounded array. Shorter than the
 * workouts window on purpose: a training day is a handful of sets, a diary day
 * can be a dozen entries across four meals.
 */
export const ENTRY_WINDOW_DAYS = 90;

/** The trailing window nutrition is judged over, for the Life Score. */
export const NUTRITION_SCORING_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// Foods
// ---------------------------------------------------------------------------

interface FoodRow {
  id: string;
  name: string;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  isFavorite: boolean;
  archivedAt: Date | null;
}

function toFoodItem(food: FoodRow): NutritionFoodItem {
  return {
    id: food.id,
    name: food.name,
    caloriesPer100: food.caloriesPer100,
    proteinPer100: food.proteinPer100,
    fatPer100: food.fatPer100,
    carbsPer100: food.carbsPer100,
    isFavorite: food.isFavorite,
    archivedAt: food.archivedAt?.toISOString() ?? null,
  };
}

/** Every food in the user's catalogue, active and archived alike. */
export async function listFoods(userId: string): Promise<NutritionFoodItem[]> {
  const foods = await db.nutritionFood.findMany({
    where: { userId },
    orderBy: [{ isFavorite: "desc" }, { name: "asc" }],
  });
  return foods.map(toFoodItem);
}

export interface FoodWriteData {
  name: string;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
}

export async function createFood(userId: string, data: FoodWriteData) {
  return db.nutritionFood.create({ data: { userId, ...data } });
}

export async function updateFood(
  userId: string,
  foodId: string,
  data: FoodWriteData,
): Promise<boolean> {
  const { count } = await db.nutritionFood.updateMany({
    where: { id: foodId, userId },
    data,
  });
  return count > 0;
}

export async function setFoodFavorite(
  userId: string,
  foodId: string,
  isFavorite: boolean,
): Promise<boolean> {
  const { count } = await db.nutritionFood.updateMany({
    where: { id: foodId, userId },
    data: { isFavorite },
  });
  return count > 0;
}

/**
 * Retire a food, or remove it outright.
 *
 * A food with entries or template lines behind it is archived rather than
 * deleted — the same choice WorkoutExercise makes, and for the same reason: a
 * diary day that already named this food must keep naming it correctly. The
 * onDelete: Restrict on NutritionEntry.foodId means a hard delete would throw
 * for an in-use food anyway; checking first turns that into an honest false
 * rather than a caught database error.
 */
export async function deleteOrArchiveFood(
  userId: string,
  foodId: string,
): Promise<boolean> {
  const food = await db.nutritionFood.findFirst({
    where: { id: foodId, userId },
    select: { id: true, _count: { select: { entries: true } } },
  });
  if (!food) return false;

  if (food._count.entries > 0) {
    await db.nutritionFood.update({ where: { id: foodId }, data: { archivedAt: new Date() } });
  } else {
    await db.nutritionFood.delete({ where: { id: foodId } });
  }

  return true;
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

interface EntryRow {
  id: string;
  mealSlot: string;
  day: Date;
  amountG: number;
  createdAt: Date;
  food: FoodRow;
}

function toMealSlot(value: string): MealSlot {
  return isMealSlot(value) ? value : "snack";
}

function toEntryItem(entry: EntryRow): NutritionEntryItem {
  return {
    id: entry.id,
    food: toFoodItem(entry.food),
    mealSlot: toMealSlot(entry.mealSlot),
    day: dateToDay(entry.day),
    amountG: entry.amountG,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function listEntries(
  userId: string,
  windowStart: CalendarDay,
): Promise<NutritionEntryItem[]> {
  const entries = await db.nutritionEntry.findMany({
    where: { userId, day: { gte: dayToDate(windowStart) } },
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
    include: { food: true },
  });
  return entries.map(toEntryItem);
}

export interface EntryWriteData {
  foodId: string;
  mealSlot: MealSlot;
  day: CalendarDay;
  amountG: number;
}

/**
 * Log one food into the diary.
 *
 * The food has to belong to the same user — checked here rather than assumed,
 * because foodId arrives from the client and nothing else downstream would
 * notice an entry filed against somebody else's catalogue. Returns null for an
 * unowned food, the entry otherwise, so the action can tell the two apart.
 */
export async function createEntry(
  userId: string,
  data: EntryWriteData,
): Promise<NutritionEntryItem | null> {
  const food = await db.nutritionFood.findFirst({
    where: { id: data.foodId, userId },
  });
  if (!food) return null;

  const entry = await db.nutritionEntry.create({
    data: {
      userId,
      foodId: data.foodId,
      mealSlot: data.mealSlot,
      day: dayToDate(data.day),
      amountG: data.amountG,
    },
    include: { food: true },
  });

  return toEntryItem(entry);
}

export async function updateEntryAmount(
  userId: string,
  entryId: string,
  amountG: number,
): Promise<boolean> {
  const { count } = await db.nutritionEntry.updateMany({
    where: { id: entryId, userId },
    data: { amountG },
  });
  return count > 0;
}

export async function deleteEntry(userId: string, entryId: string): Promise<boolean> {
  const { count } = await db.nutritionEntry.deleteMany({ where: { id: entryId, userId } });
  return count > 0;
}

/**
 * Apply a template: log every one of its lines as an entry on one day.
 *
 * Lines whose food has since been deleted are skipped rather than failing the
 * whole apply — a template is a convenience list, and one stale line should not
 * block logging the rest of a real breakfast. Runs as a single transaction so a
 * partially applied template never leaves the diary half-written.
 */
export async function applyTemplate(
  userId: string,
  templateId: string,
  mealSlot: MealSlot,
  day: CalendarDay,
): Promise<NutritionEntryItem[]> {
  const template = await db.nutritionMealTemplate.findFirst({
    where: { id: templateId, userId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!template) return [];

  const foodIds = template.items.map((item) => item.foodId);
  const foods = await db.nutritionFood.findMany({
    where: { id: { in: foodIds }, userId, archivedAt: null },
  });
  const foodById = new Map(foods.map((food) => [food.id, food]));

  const usable = template.items.filter((item) => foodById.has(item.foodId));
  if (usable.length === 0) return [];

  const date = dayToDate(day);

  const created = await db.$transaction(
    usable.map((item) =>
      db.nutritionEntry.create({
        data: { userId, foodId: item.foodId, mealSlot, day: date, amountG: item.amountG },
        include: { food: true },
      }),
    ),
  );

  return created.map(toEntryItem);
}

/**
 * Apply a curated preset (see lib/quick-templates.ts): find-or-create the food
 * it names in the user's own catalogue, then log it.
 *
 * A repeat application of the same preset must not pile up duplicate foods
 * named "Овсянка" — the first application creates the row, every later one
 * reuses it, including any macros the user has since corrected on it. Only an
 * *active* food is reused; an archived one with the same name is left alone
 * and a fresh row is created instead, the same rule createEntry's food lookup
 * would otherwise silently violate by resurrecting a retired food.
 */
export async function applyQuickTemplate(
  userId: string,
  preset: QuickMealTemplate,
  mealSlot: MealSlot,
  day: CalendarDay,
): Promise<NutritionEntryItem> {
  const existing = await db.nutritionFood.findFirst({
    where: { userId, name: preset.name, archivedAt: null },
  });

  const food =
    existing ??
    (await db.nutritionFood.create({
      data: { userId, ...quickTemplateFoodDraft(preset) },
    }));

  const entry = await db.nutritionEntry.create({
    data: { userId, foodId: food.id, mealSlot, day: dayToDate(day), amountG: preset.amountG },
    include: { food: true },
  });

  return toEntryItem(entry);
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export async function listWater(
  userId: string,
  windowStart: CalendarDay,
): Promise<NutritionWaterItem[]> {
  const rows = await db.nutritionWaterLog.findMany({
    where: { userId, day: { gte: dayToDate(windowStart) } },
    orderBy: { day: "asc" },
  });
  return rows.map((row) => ({ day: dateToDay(row.day), amountMl: row.amountMl }));
}

/**
 * Add to (or subtract from) one day's running water total.
 *
 * A negative delta undoes a mistap without needing a separate "undo" action —
 * the same +/- vocabulary the water widget already uses. The total never goes
 * below zero: a correction larger than what was logged just clears the day
 * rather than recording a negative amount of water.
 */
export async function addWater(
  userId: string,
  day: CalendarDay,
  deltaMl: number,
): Promise<number> {
  const date = dayToDate(day);
  const existing = await db.nutritionWaterLog.findUnique({
    where: { userId_day: { userId, day: date } },
    select: { amountMl: true },
  });

  const nextAmount = Math.max(0, (existing?.amountMl ?? 0) + deltaMl);

  const row = await db.nutritionWaterLog.upsert({
    where: { userId_day: { userId, day: date } },
    create: { userId, day: date, amountMl: nextAmount },
    update: { amountMl: nextAmount },
  });

  return row.amountMl;
}

// ---------------------------------------------------------------------------
// Meal templates
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  name: string;
  mealSlot: string;
  items: { foodId: string; amountG: number; position: number }[];
}

function toTemplate(
  template: TemplateRow,
  foodById: Map<string, FoodRow>,
): NutritionMealTemplate {
  return {
    id: template.id,
    name: template.name,
    mealSlot: toMealSlot(template.mealSlot),
    items: template.items.map((item) => ({
      foodId: item.foodId,
      food: foodById.has(item.foodId) ? toFoodItem(foodById.get(item.foodId)!) : null,
      amountG: item.amountG,
      position: item.position,
    })),
  };
}

export async function listTemplates(userId: string): Promise<NutritionMealTemplate[]> {
  const [templates, foods] = await Promise.all([
    db.nutritionMealTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    db.nutritionFood.findMany({ where: { userId } }),
  ]);

  const foodById = new Map(foods.map((food) => [food.id, food]));
  return templates.map((template) => toTemplate(template, foodById));
}

export interface TemplateWriteData {
  name: string;
  mealSlot: MealSlot;
  items: NutritionMealTemplateItemInput[];
}

/**
 * A forged foodId that does not belong to this user is dropped rather than
 * trusted, the same ownership check createEntry makes — otherwise a template
 * could be built pointing at somebody else's catalogue.
 */
export async function createTemplate(userId: string, data: TemplateWriteData) {
  const foods = await db.nutritionFood.findMany({
    where: { userId, id: { in: data.items.map((item) => item.foodId) } },
    select: { id: true },
  });
  const ownedIds = new Set(foods.map((food) => food.id));
  const items = data.items.filter((item) => ownedIds.has(item.foodId));

  return db.nutritionMealTemplate.create({
    data: {
      userId,
      name: data.name,
      mealSlot: data.mealSlot,
      items: {
        create: items.map((item, index) => ({
          foodId: item.foodId,
          amountG: item.amountG,
          position: index,
        })),
      },
    },
  });
}

/**
 * Replace a template's lines wholesale.
 *
 * Unlike updateWorkout there is no history pointing at a template line's id —
 * applying a template copies its amounts into fresh NutritionEntry rows and
 * forgets where they came from — so a delete-and-recreate of the item rows is
 * honest here where it would not be for WorkoutExercise.
 */
export async function updateTemplate(
  userId: string,
  templateId: string,
  data: TemplateWriteData,
): Promise<boolean> {
  const template = await db.nutritionMealTemplate.findFirst({
    where: { id: templateId, userId },
    select: { id: true },
  });
  if (!template) return false;

  const foods = await db.nutritionFood.findMany({
    where: { userId, id: { in: data.items.map((item) => item.foodId) } },
    select: { id: true },
  });
  const ownedIds = new Set(foods.map((food) => food.id));
  const items = data.items.filter((item) => ownedIds.has(item.foodId));

  await db.$transaction([
    db.nutritionMealTemplateItem.deleteMany({ where: { templateId } }),
    db.nutritionMealTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        mealSlot: data.mealSlot,
        items: {
          create: items.map((item, index) => ({
            foodId: item.foodId,
            amountG: item.amountG,
            position: index,
          })),
        },
      },
    }),
  ]);

  return true;
}

export async function deleteTemplate(userId: string, templateId: string): Promise<boolean> {
  // Item rows go with it via onDelete: Cascade.
  const { count } = await db.nutritionMealTemplate.deleteMany({
    where: { id: templateId, userId },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

const DEFAULT_GOAL: NutritionGoalItem = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  waterMl: 2000,
};

/** The user's target, or the default if they have never set one. */
export async function getGoal(userId: string): Promise<NutritionGoalItem> {
  const goal = await db.nutritionGoal.findUnique({ where: { userId } });
  if (!goal) return DEFAULT_GOAL;
  return {
    calories: goal.calories,
    proteinG: goal.proteinG,
    fatG: goal.fatG,
    carbsG: goal.carbsG,
    waterMl: goal.waterMl,
  };
}

export async function setGoal(
  userId: string,
  data: NutritionGoalItem,
): Promise<NutritionGoalItem> {
  const goal = await db.nutritionGoal.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
  return {
    calories: goal.calories,
    proteinG: goal.proteinG,
    fatG: goal.fatG,
    carbsG: goal.carbsG,
    waterMl: goal.waterMl,
  };
}

// ---------------------------------------------------------------------------
// Aggregates for the Life Score and the Coach
// ---------------------------------------------------------------------------

export interface NutritionAdherence {
  /** Whether a calorie goal is even set — with none, nothing is owed. */
  hasGoal: boolean;
  /** Days in the trailing window the goal existed for. */
  expected: number;
  /** Days on which at least one entry was logged. */
  daysLogged: number;
}

/**
 * Logging adherence over the trailing `days`, for the Life Score.
 *
 * Mirrors getWorkoutAdherence/getHabitAdherence in shape and in spirit: a day
 * is "kept" simply by having at least one entry, because the score is about
 * whether the diary is being kept at all, not about hitting the calorie target
 * exactly — a goal is a target to aim at, not a pass/fail gate, and scoring on
 * it would punish a day that ran a little over as harshly as a day nothing was
 * logged at all.
 *
 * Days before the goal was created are excluded from `expected`, the same
 * clipping-to-creation-day rule every other adherence aggregate applies — a
 * user who sets a goal today is not retroactively judged for yesterday.
 */
export async function getNutritionAdherence(
  userId: string,
  today: CalendarDay,
  days: number,
): Promise<NutritionAdherence> {
  const windowFrom = addDays(today, -(days - 1));

  const goal = await db.nutritionGoal.findUnique({
    where: { userId },
    select: { calories: true, createdAt: true },
  });

  if (!goal || goal.calories === 0) {
    return { hasGoal: false, expected: 0, daysLogged: 0 };
  }

  const goalCreatedDay = dateToDay(goal.createdAt);
  const from = goalCreatedDay > windowFrom ? goalCreatedDay : windowFrom;
  const span = diffDays(from, today);
  const expected = span < 0 ? 0 : span + 1;

  const loggedDays = await db.nutritionEntry.findMany({
    where: { userId, day: { gte: dayToDate(from), lte: dayToDate(today) } },
    select: { day: true },
    distinct: ["day"],
  });

  return { hasGoal: true, expected, daysLogged: loggedDays.length };
}
