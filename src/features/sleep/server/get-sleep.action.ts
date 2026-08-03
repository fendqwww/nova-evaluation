"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import { SLEEP_WINDOW_DAYS, listLogs } from "@/features/sleep/server/sleep.repository";
import type { SleepSnapshot } from "@/features/sleep/types";

/** The Сон screen in one fetch. `today` is resolved from the profile
 *  timezone server-side, the same rule getWorkouts/getNutrition follow. */
export async function getSleep(rawInitData: string | undefined): Promise<SleepSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);
  const windowStart = addDays(today, -(SLEEP_WINDOW_DAYS - 1));

  const logs = await listLogs(userId, windowStart);

  return { today, windowStart, logs };
}
