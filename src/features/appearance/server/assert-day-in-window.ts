import "server-only";
import { diffDays, type CalendarDay } from "@/shared/lib/calendar-day";
import {
  LOG_WINDOW_DAYS,
  PHOTO_WINDOW_DAYS,
} from "@/features/appearance/server/appearance.repository";

/**
 * Bound a day against the server's own idea of today.
 *
 * Backdating inside the loaded window is legitimate — people do remember the
 * evening routine they forgot to tick — but a future day has not happened yet,
 * and a day older than the window could never be seen or undone in the UI. Both
 * would only ever arrive from a forged payload, and both would manufacture care
 * nobody did.
 *
 * Shared by every action that takes a day so the two ends of the range cannot
 * drift apart between them. Same guard workouts uses, against this section's
 * own windows — and there are two, because photos are loaded a year back where
 * logs are loaded half of one, and a photo dated outside the window it will be
 * listed in is a row the user can never see.
 */
export function assertDayInWindow(day: CalendarDay, today: CalendarDay): void {
  assertWithin(day, today, LOG_WINDOW_DAYS);
}

export function assertPhotoDayInWindow(day: CalendarDay, today: CalendarDay): void {
  assertWithin(day, today, PHOTO_WINDOW_DAYS);
}

function assertWithin(day: CalendarDay, today: CalendarDay, windowDays: number): void {
  const age = diffDays(day, today);
  if (age < 0) throw new Error("DAY_IN_FUTURE");
  if (age >= windowDays) throw new Error("DAY_OUT_OF_WINDOW");
}
