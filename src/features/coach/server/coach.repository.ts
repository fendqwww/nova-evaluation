import "server-only";
import { db } from "@/server/db";
import { dateToDay, dayToDate, type CalendarDay } from "@/shared/lib/calendar-day";
import { coachAnswerSchema, coachRoleSchema } from "@/features/coach/schemas";
import type { CoachAnswer, CoachMessageItem } from "@/features/coach/types";

/**
 * The conversation, and only the conversation.
 *
 * There is no query here that stores or reads a metric: everything the Coach
 * says about the user is recomputed from Goal/Habit/Task/Profile when it
 * answers. What lives in this table is what was *said*, which is the one thing
 * that genuinely cannot be derived a second time.
 *
 * Every function folds the caller's own userId into its where-clause, the same
 * ownership rule the other repositories follow.
 */

type CoachMessageRow = {
  id: string;
  role: string;
  content: string;
  payload: string | null;
  day: Date;
  createdAt: Date;
};

/**
 * A stored payload back into a card.
 *
 * A row written by an older version — or by a future one — must degrade to its
 * plain-text `content` rather than take the history screen down, so a parse
 * failure is a null, never a throw. This is the same reason toSchedule() falls
 * back to daily on an unrecognised frequency.
 */
function toAnswer(payload: string | null): CoachAnswer | null {
  if (!payload) return null;

  try {
    const parsed: unknown = JSON.parse(payload);
    const result = coachAnswerSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function toMessageItem(row: CoachMessageRow): CoachMessageItem {
  const role = coachRoleSchema.safeParse(row.role);

  return {
    id: row.id,
    // An unrecognised role reads as the coach speaking: a bubble attributed to
    // the wrong side is confusing, but an assistant bubble is at least never
    // mistaken for something the user themselves wrote.
    role: role.success ? role.data : "coach",
    text: row.content,
    answer: toAnswer(row.payload),
    day: dateToDay(row.day),
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CoachMessageWrite {
  role: "user" | "coach";
  content: string;
  answer: CoachAnswer | null;
  day: CalendarDay;
}

export async function appendCoachMessage(
  userId: string,
  data: CoachMessageWrite,
): Promise<CoachMessageItem> {
  const row = await db.coachMessage.create({
    data: {
      userId,
      role: data.role,
      content: data.content,
      payload: data.answer ? JSON.stringify(data.answer) : null,
      day: dayToDate(data.day),
    },
  });

  return toMessageItem(row);
}

/**
 * The newest `limit` turns, returned oldest-first.
 *
 * The query is newest-first because that is the end of the conversation worth
 * loading; the reversal happens here so every consumer — the chat list, the
 * Gemini context builder — reads in reading order and none of them has to
 * remember to flip it. `hasMore` comes from asking for one extra row rather
 * than a second COUNT.
 */
export async function listRecentCoachMessages(
  userId: string,
  limit: number,
): Promise<{ messages: CoachMessageItem[]; hasMore: boolean }> {
  const rows = await db.coachMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const page = rows.slice(0, limit).reverse();
  return { messages: page.map(toMessageItem), hasMore: rows.length > limit };
}

/**
 * The page of turns immediately older than `beforeId` — "показать раньше".
 *
 * Keyset pagination on (createdAt, id) rather than an offset: history only
 * grows at the newest end, so an offset would silently shift under any turn
 * taken while the user scrolls back. An id that is not the caller's own matches
 * nothing and returns an empty page, which is the correct answer.
 */
export async function listCoachMessagesBefore(
  userId: string,
  beforeId: string,
  limit: number,
): Promise<{ messages: CoachMessageItem[]; hasMore: boolean }> {
  const anchor = await db.coachMessage.findFirst({
    where: { id: beforeId, userId },
    select: { createdAt: true, id: true },
  });
  if (!anchor) return { messages: [], hasMore: false };

  const rows = await db.coachMessage.findMany({
    where: {
      userId,
      OR: [
        { createdAt: { lt: anchor.createdAt } },
        // Same millisecond, earlier row: cuid ordering is monotonic enough to
        // break the tie deterministically, and without this clause a burst of
        // turns written in one tick could repeat or skip a row.
        { createdAt: anchor.createdAt, id: { lt: anchor.id } },
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const page = rows.slice(0, limit).reverse();
  return { messages: page.map(toMessageItem), hasMore: rows.length > limit };
}
