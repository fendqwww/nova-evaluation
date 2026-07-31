import "server-only";
import { diffDays, type CalendarDay } from "@/shared/lib/calendar-day";
import { SESSION_WINDOW_DAYS } from "@/features/workouts/server/workouts.repository";

/**
 * Bound a day against the server's own idea of today.
 *
 * Backdating inside the loaded window is legitimate — people do log the session
 * they forgot on Tuesday — but a future day has not happened yet, and a day
 * older than the window could never be seen or undone in the UI. Both would
 * only ever arrive from a forged payload, and both would manufacture training
 * nobody did.
 *
 * Shared by every action that takes a day so the two ends of the range cannot
 * drift apart between them.
 */
export function assertDayInWindow(day: CalendarDay, today: CalendarDay): void {
  const age = diffDays(day, today);
  if (age < 0) throw new Error("DAY_IN_FUTURE");
  if (age >= SESSION_WINDOW_DAYS) throw new Error("DAY_OUT_OF_WINDOW");
}
