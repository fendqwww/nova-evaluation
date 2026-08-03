import "server-only";
import { db } from "@/server/db";
import { coachMemoryKindSchema, COACH_MEMORY_CAP } from "@/features/coach/schemas";
import type { CoachMemoryItem } from "@/features/coach/types";

/**
 * What the Coach remembers, and only that.
 *
 * The sibling of coach.repository.ts: that one stores what was *said*, this
 * one stores what was *learned*. Both fold the caller's own userId into every
 * where-clause, the same ownership rule every repository here follows.
 *
 * Nothing in this table is ever derived — a fact gets here because the user
 * stated it and the model wrote it down (see src/ai/coach.ts). That is what
 * makes it safe to repeat back verbatim a month later: it was never an
 * inference in the first place.
 */

type CoachMemoryRow = {
  key: string;
  kind: string;
  value: string;
  updatedAt: Date;
};

function toItem(row: CoachMemoryRow): CoachMemoryItem {
  const kind = coachMemoryKindSchema.safeParse(row.kind);

  return {
    key: row.key,
    // An unrecognised kind reads as plain context — the fact is still true and
    // still worth carrying, it just stops being treated as a constraint. Same
    // degrade-don't-throw policy as toAnswer in coach.repository.ts.
    kind: kind.success ? kind.data : "context",
    value: row.value,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Everything the Coach knows about this user, most recently confirmed first.
 *
 * Capped rather than paginated: this list travels inside a prompt, and a
 * prompt that carries a hundred facts costs real tokens to say what the forty
 * freshest ones already say.
 */
export async function listCoachMemories(
  userId: string,
  limit: number = COACH_MEMORY_CAP,
): Promise<CoachMemoryItem[]> {
  const rows = await db.coachMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { key: true, kind: true, value: true, updatedAt: true },
  });

  return rows.map(toItem);
}

export interface CoachMemoryWrite {
  key: string;
  kind: CoachMemoryItem["kind"];
  value: string;
}

/**
 * Write down what an answer learned.
 *
 * Upsert on (userId, key), which is what makes the key the whole point: the
 * model reusing `dislikes-running` refines the fact it already wrote rather
 * than filing a second, slightly different copy of it. Restating an unchanged
 * fact is still a write, and deliberately so — it moves `updatedAt`, which is
 * what keeps a live preference ahead of a stale one when the list is trimmed.
 *
 * Failures are swallowed. Memory is an enhancement to the *next* conversation;
 * losing a fact must never cost the user the answer they are waiting on right
 * now.
 */
export async function rememberCoachFacts(
  userId: string,
  facts: CoachMemoryWrite[],
): Promise<void> {
  if (facts.length === 0) return;

  try {
    await Promise.all(
      facts.map((fact) =>
        db.coachMemory.upsert({
          where: { userId_key: { userId, key: fact.key } },
          create: { userId, key: fact.key, kind: fact.kind, value: fact.value },
          update: { kind: fact.kind, value: fact.value },
        }),
      ),
    );

    await pruneCoachMemories(userId);
  } catch (error) {
    console.error("[coach-memory] failed to store facts", error);
  }
}

/**
 * Keep the newest COACH_MEMORY_CAP facts and drop the rest.
 *
 * A ceiling rather than unbounded growth, for the same reason the list is
 * capped on read: what the Coach can actually use is what fits in a prompt.
 * Oldest-confirmed-first is the right thing to lose — a preference nobody has
 * mentioned in months is the one most likely to have quietly changed.
 */
async function pruneCoachMemories(userId: string): Promise<void> {
  const surplus = await db.coachMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    skip: COACH_MEMORY_CAP,
    select: { id: true },
  });

  if (surplus.length === 0) return;

  await db.coachMemory.deleteMany({
    where: { userId, id: { in: surplus.map((row) => row.id) } },
  });
}
