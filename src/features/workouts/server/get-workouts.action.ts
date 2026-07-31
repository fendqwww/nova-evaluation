"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import {
  SESSION_WINDOW_DAYS,
  listSessions,
  listWorkouts,
} from "@/features/workouts/server/workouts.repository";
import type { WorkoutsSnapshot } from "@/features/workouts/types";

/**
 * The Тренировки screen in one fetch.
 *
 * `today` is resolved from the profile timezone here, not on the client: the
 * day a session is filed under has to be the same day the server will store,
 * and a device with a skewed clock must not be able to decide otherwise.
 */
export async function getWorkouts(
  rawInitData: string | undefined,
): Promise<WorkoutsSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);
  const windowStart = addDays(today, -(SESSION_WINDOW_DAYS - 1));

  const [workouts, sessions] = await Promise.all([
    listWorkouts(userId, timezone),
    listSessions(userId, windowStart),
  ]);

  return { today, windowStart, workouts, sessions };
}
