import { addDays, diffDays, maxDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { areaLabel } from "@/features/appearance/lib/areas";
import { isScheduledOn } from "@/features/appearance/lib/schedule";
import { doneOn } from "@/features/appearance/lib/stats";
import type {
  CareArea,
  CareGoalItem,
  CarePhotoItem,
  CareRoutineItem,
} from "@/features/appearance/types";

/**
 * "История изменений" — reconstructed, never recorded.
 *
 * There is no event-log table behind this and deliberately so: every entry
 * below is already a fact somewhere else — a photo has the day it was taken, a
 * goal has completedAt, a routine has createdAt and archivedAt, a streak is
 * derived from logs. A parallel table of "what happened" would be a second
 * source of truth that goes stale the moment a photo is deleted or a goal is
 * reopened, which is the same reason Goal has no `progress` column and
 * CoachAnalysis rebuilds yesterday from the tables rather than from a snapshot.
 *
 * The practical payoff is that a user who did not open the app for a month
 * still gets a complete history: nothing had to be written at the time.
 */

export type CareEventKind =
  | "photo"
  | "goal_created"
  | "goal_completed"
  | "routine_created"
  | "routine_archived"
  | "streak";

export interface CareEvent {
  id: string;
  kind: CareEventKind;
  day: CalendarDay;
  title: string;
  /** The supporting line under the title. Empty when the title says it all. */
  detail: string;
  area: CareArea | null;
  /** Set only on a photo event, so the timeline can show the thumbnail. */
  photo: CarePhotoItem | null;
}

/** Streaks worth calling out. Below a week it is not yet a story. */
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 180, 365];

/**
 * The whole section's history, newest first.
 *
 * Bounded by the loaded window at the far end, like everything else here —
 * `windowStart` is the horizon of the logs the streak milestones are derived
 * from, so a milestone that fell outside it is simply not claimed rather than
 * being guessed at.
 */
export function buildHistory(
  routines: CareRoutineItem[],
  photos: CarePhotoItem[],
  goals: CareGoalItem[],
  today: CalendarDay,
  windowStart: CalendarDay,
): CareEvent[] {
  const events: CareEvent[] = [];

  for (const photo of photos) {
    events.push({
      id: `photo-${photo.id}`,
      kind: "photo",
      day: photo.day,
      title: `Фото прогресса — ${areaLabel(photo.area).toLocaleLowerCase("ru")}`,
      detail: photo.note ?? "",
      area: photo.area,
      photo,
    });
  }

  for (const goal of goals) {
    events.push({
      id: `goal-new-${goal.id}`,
      kind: "goal_created",
      day: goal.createdDay,
      title: `Новая цель: ${goal.title}`,
      detail: areaLabel(goal.area),
      area: goal.area,
      photo: null,
    });

    if (goal.isCompleted && goal.completedAt) {
      events.push({
        id: `goal-done-${goal.id}`,
        kind: "goal_completed",
        day: goal.completedAt.slice(0, 10),
        title: `Цель достигнута: ${goal.title}`,
        detail: areaLabel(goal.area),
        area: goal.area,
        photo: null,
      });
    }
  }

  for (const routine of routines) {
    events.push({
      id: `routine-new-${routine.id}`,
      kind: "routine_created",
      day: routine.createdDay,
      title: `Добавлена процедура: ${routine.title}`,
      detail: areaLabel(routine.area),
      area: routine.area,
      photo: null,
    });

    if (routine.archivedAt) {
      events.push({
        id: `routine-off-${routine.id}`,
        kind: "routine_archived",
        day: routine.archivedAt.slice(0, 10),
        title: `Процедура в архиве: ${routine.title}`,
        detail: areaLabel(routine.area),
        area: routine.area,
        photo: null,
      });
    }

    events.push(...streakEvents(routine, today, windowStart));
  }

  return events
    .filter((event) => diffDays(windowStart, event.day) >= 0 && diffDays(event.day, today) >= 0)
    .sort((a, b) => (a.day === b.day ? weight(b.kind) - weight(a.kind) : b.day.localeCompare(a.day)));
}

/**
 * The day each streak milestone was reached, recovered from the log.
 *
 * Walks the completion days in order and emits an event on the day a run first
 * crossed each threshold — so "30 дней подряд" is dated to the day it actually
 * happened rather than to today. A broken run resets the counter, which is why
 * the same milestone can legitimately appear twice for a routine picked back up
 * months later.
 */
function streakEvents(
  routine: CareRoutineItem,
  today: CalendarDay,
  windowStart: CalendarDay,
): CareEvent[] {
  if (routine.schedule.kind === "weekly") return [];

  const events: CareEvent[] = [];
  const from = maxDay(routine.createdDay, windowStart);
  if (diffDays(from, today) < 0) return [];

  let run = 0;

  for (let day = from; diffDays(day, today) >= 0; day = addDays(day, 1)) {
    if (doneOn(routine, day)) {
      run += 1;
      if (STREAK_MILESTONES.includes(run)) {
        events.push({
          id: `streak-${routine.id}-${day}-${run}`,
          kind: "streak",
          day,
          title: `${run} дней подряд: ${routine.title}`,
          detail: areaLabel(routine.area),
          area: routine.area,
          photo: null,
        });
      }
    } else if (isScheduledOn(routine.schedule, day)) {
      // Only a *missed scheduled* day breaks the run — a weekday-only routine
      // owes nothing on Sunday, and zeroing there would make the milestone
      // unreachable rather than merely rare.
      run = 0;
    }
  }

  return events;
}

/** Same-day ordering: the loud things first, the bookkeeping last. */
function weight(kind: CareEventKind): number {
  switch (kind) {
    case "goal_completed":
      return 5;
    case "streak":
      return 4;
    case "photo":
      return 3;
    case "goal_created":
      return 2;
    case "routine_created":
      return 1;
    case "routine_archived":
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Before / after
// ---------------------------------------------------------------------------

export interface PhotoPair {
  before: CarePhotoItem;
  after: CarePhotoItem;
  /** Whole days between the two shots. */
  daysApart: number;
}

/**
 * The comparison the До/После view opens on: the oldest and newest photo of an
 * area.
 *
 * Two photos of the same area or nothing at all — comparing skin against a
 * beard shot would be a picture of two different things presented as change
 * over time, which is exactly the lie a progress comparison must not tell.
 */
export function defaultPair(photos: CarePhotoItem[], area: CareArea): PhotoPair | null {
  const inArea = photos
    .filter((photo) => photo.area === area)
    .sort((a, b) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt));

  if (inArea.length < 2) return null;

  const before = inArea[0];
  const after = inArea[inArea.length - 1];
  return { before, after, daysApart: diffDays(before.day, after.day) };
}

/** Areas with at least two photos — the only ones a comparison can be built for. */
export function comparableAreas(photos: CarePhotoItem[]): CareArea[] {
  const counts = new Map<CareArea, number>();
  for (const photo of photos) {
    counts.set(photo.area, (counts.get(photo.area) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 2).map(([area]) => area);
}

export function photoCountsByArea(photos: CarePhotoItem[]): Map<CareArea, number> {
  const counts = new Map<CareArea, number>();
  for (const photo of photos) {
    counts.set(photo.area, (counts.get(photo.area) ?? 0) + 1);
  }
  return counts;
}
