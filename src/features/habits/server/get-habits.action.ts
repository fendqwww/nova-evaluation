"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import { LOG_WINDOW_DAYS, listHabits } from "@/features/habits/server/habits.repository";
import type { HabitsSnapshot } from "@/features/habits/types";

/**
 * The Habits screen in one fetch.
 *
 * `today` is resolved from the profile timezone here, not on the client: the
 * day being ticked has to be the same day the server will store, and a device
 * with a skewed clock must not be able to decide otherwise.
 */
export async function getHabits(
  rawInitData: string | undefined,
): Promise<HabitsSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);
  const windowStart = addDays(today, -(LOG_WINDOW_DAYS - 1));

  return {
    today,
    windowStart,
    habits: await listHabits(userId, timezone, windowStart),
  };
}
