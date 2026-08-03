import "server-only";
import { db } from "@/server/db";
import { dateToDay, dayToDate, type CalendarDay } from "@/shared/lib/calendar-day";
import { minutesBetween } from "@/features/sleep/lib/duration";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * How much sleep history travels to the client — a day-scoped table, the same
 * bounded-window convention as workouts.repository.ts and
 * nutrition.repository.ts.
 */
export const SLEEP_WINDOW_DAYS = 90;

interface LogRow {
  id: string;
  day: Date;
  bedTime: string;
  wakeTime: string;
  durationMin: number;
  quality: number;
  note: string | null;
  createdAt: Date;
}

function toItem(row: LogRow): SleepLogItem {
  return {
    id: row.id,
    day: dateToDay(row.day),
    bedTime: row.bedTime,
    wakeTime: row.wakeTime,
    durationMin: row.durationMin,
    quality: row.quality,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listLogs(
  userId: string,
  windowStart: CalendarDay,
): Promise<SleepLogItem[]> {
  const rows = await db.sleepLog.findMany({
    where: { userId, day: { gte: dayToDate(windowStart) } },
    orderBy: { day: "asc" },
  });
  return rows.map(toItem);
}

export interface SleepLogWriteData {
  day: CalendarDay;
  bedTime: string;
  wakeTime: string;
  quality: number;
  note: string | null;
}

/**
 * Log (or correct) one night. One row per day — logging the same day twice
 * overwrites it, the same "current fact about that day" semantics
 * NutritionWaterLog uses, rather than accumulating duplicate rows a user then
 * has to pick between.
 */
export async function upsertLog(
  userId: string,
  data: SleepLogWriteData,
): Promise<SleepLogItem> {
  const date = dayToDate(data.day);
  const durationMin = minutesBetween(data.bedTime, data.wakeTime);

  const row = await db.sleepLog.upsert({
    where: { userId_day: { userId, day: date } },
    create: {
      userId,
      day: date,
      bedTime: data.bedTime,
      wakeTime: data.wakeTime,
      durationMin,
      quality: data.quality,
      note: data.note,
    },
    update: {
      bedTime: data.bedTime,
      wakeTime: data.wakeTime,
      durationMin,
      quality: data.quality,
      note: data.note,
    },
  });

  return toItem(row);
}

export async function deleteLog(userId: string, logId: string): Promise<boolean> {
  const { count } = await db.sleepLog.deleteMany({ where: { id: logId, userId } });
  return count > 0;
}

// Sleep has no aggregate helper here on purpose: it is reported to the Coach
// but deliberately not scored (see the note in build-coach-analysis.ts), and
// everything the Coach and Отчёты read is derived client-side from the logs by
// lib/stats.ts rather than counted again in SQL.
