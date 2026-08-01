"use server";

import { db } from "@/server/db";
import { requireUserContext } from "@/server/auth/current-user";
import { addDays, todayIn } from "@/shared/lib/calendar-day";
import {
  LOG_WINDOW_DAYS,
  PHOTO_WINDOW_DAYS,
  listCareGoals,
  listPhotos,
  listRoutines,
} from "@/features/appearance/server/appearance.repository";
import type { AppearanceSnapshot } from "@/features/appearance/types";

/**
 * The Внешность screen in one fetch.
 *
 * `today` is resolved from the profile timezone here, not on the client — the
 * day a routine is ticked for has to be the day the server will store, and a
 * device with a skewed clock must not be able to decide otherwise.
 *
 * `gender` is read alongside because it decides whether the beard area is
 * offered when creating a routine. It gates the *offer* only; nothing about
 * rendering an existing routine depends on it, so changing gender never makes
 * a saved routine disappear.
 */
export async function getAppearance(
  rawInitData: string | undefined,
): Promise<AppearanceSnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);

  const today = todayIn(timezone);
  const windowStart = addDays(today, -(LOG_WINDOW_DAYS - 1));
  const photoWindowStart = addDays(today, -(PHOTO_WINDOW_DAYS - 1));

  const [profile, routines, photos, goals] = await Promise.all([
    db.profile.findUnique({ where: { userId }, select: { gender: true } }),
    listRoutines(userId, timezone, windowStart),
    listPhotos(userId, photoWindowStart),
    listCareGoals(userId, timezone),
  ]);

  return {
    today,
    windowStart,
    gender: profile?.gender ?? "other",
    routines,
    photos,
    goals,
  };
}
