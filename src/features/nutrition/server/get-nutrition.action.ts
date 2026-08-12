"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import {
  ENTRY_WINDOW_DAYS,
  getGoal,
  getGoalStartedAt,
  listEntries,
  listFoods,
  listTemplates,
  listWater,
} from "@/features/nutrition/server/nutrition.repository";
import type { NutritionSnapshot } from "@/features/nutrition/types";

/**
 * The Питание screen in one fetch.
 *
 * `today` is resolved from the profile timezone here, not on the client — the
 * day an entry is filed under has to be the same day the server will store,
 * and a device with a skewed clock must not be able to decide otherwise.
 */
export async function getNutrition(
  rawInitData: string | undefined,
): Promise<NutritionSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);
  const windowStart = addDays(today, -(ENTRY_WINDOW_DAYS - 1));

  const [foods, entries, water, templates, goal, goalStartedAt] = await Promise.all([
    listFoods(userId),
    listEntries(userId, windowStart),
    listWater(userId, windowStart),
    listTemplates(userId),
    getGoal(userId),
    getGoalStartedAt(userId),
  ]);

  return { today, windowStart, foods, entries, water, templates, goal, goalStartedAt };
}
