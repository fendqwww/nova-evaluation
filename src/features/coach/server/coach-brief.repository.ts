import "server-only";
import { db } from "@/server/db";
import { dayToDate, type CalendarDay } from "@/shared/lib/calendar-day";
import { coachAnswerSchema } from "@/features/coach/schemas";
import type { CoachAnswer } from "@/features/coach/types";

/**
 * Today's AI briefing, written once and read all day.
 *
 * The Coach opens with a message nobody asked for, and that message costs a
 * Gemini call. Without a cache the cost would be per screen open rather than
 * per day, which is both wasteful and wrong: a briefing that changes every
 * time you glance at it is not a briefing, it is noise.
 *
 * A cached row is deliberately *not* refreshed when the day's numbers move.
 * The morning's reading is what the morning's advice was based on, and a card
 * that quietly rewrites itself after every logged meal would make the Coach
 * look like it never had an opinion. The conversation below it is where a
 * fresh answer comes from.
 */

/** The briefing written for `day`, or null if there is not one yet. */
export async function getCoachDailyBrief(
  userId: string,
  day: CalendarDay,
): Promise<CoachAnswer | null> {
  const row = await db.coachDailyBrief.findUnique({
    where: { userId_day: { userId, day: dayToDate(day) } },
    select: { payload: true },
  });
  if (!row) return null;

  // A payload written by an older version must degrade to "нет брифинга" and
  // let today's be regenerated, never take the screen down — the same policy
  // toAnswer follows in coach.repository.ts.
  try {
    const result = coachAnswerSchema.safeParse(JSON.parse(row.payload) as unknown);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Store the briefing for `day`.
 *
 * Upsert rather than create: two screen opens in the same second can both find
 * no cached row and both generate one, and the second write landing on the
 * first is a far better outcome than a unique-constraint error thrown at a
 * user who only opened the app.
 */
export async function putCoachDailyBrief(
  userId: string,
  day: CalendarDay,
  answer: CoachAnswer,
): Promise<void> {
  const payload = JSON.stringify(answer);

  await db.coachDailyBrief.upsert({
    where: { userId_day: { userId, day: dayToDate(day) } },
    create: { userId, day: dayToDate(day), payload },
    update: { payload },
  });
}
