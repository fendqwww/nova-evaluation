import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * One logged night, keyed by the day woken up on — not the day gone to bed.
 * `durationMin` is always server-computed from bedTime/wakeTime (see
 * lib/duration.ts), never trusted from the client.
 */
export interface SleepLogItem {
  id: string;
  day: CalendarDay;
  /** "HH:mm", 24h. */
  bedTime: string;
  /** "HH:mm", 24h. */
  wakeTime: string;
  durationMin: number;
  /** 1 (плохо) – 5 (отлично). */
  quality: number;
  note: string | null;
  createdAt: string;
}

/**
 * One fetch of the Сон screen. `logs` are loaded for a bounded window, the
 * same convention WorkoutsSnapshot/NutritionSnapshot use for their history.
 */
export interface SleepSnapshot {
  today: CalendarDay;
  windowStart: CalendarDay;
  logs: SleepLogItem[];
}
