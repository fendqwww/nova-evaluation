import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { AppearanceAnalysis } from "@/ai/types";

/**
 * Which part of the body a routine, photo or goal is about.
 *
 * A closed union rather than free-form tags, the same reasoning MealSlot and
 * WorkoutCategory use: the area drives the icon, the grouping of the day's
 * list, and which photos are comparable with which. "custom" is the escape
 * hatch that makes "собственные процедуры" a first-class option instead of a
 * category everything unusual gets mis-filed under.
 *
 * "beard" is only *offered* to a male profile (see AppearanceSnapshot.gender),
 * but it is never rejected on read: a routine created before a profile change
 * must keep rendering rather than becoming an unreadable row.
 */
export type CareArea =
  | "skin"
  | "hair"
  | "teeth"
  | "body"
  | "beard"
  | "nails"
  | "custom";

/**
 * When in the day a routine belongs.
 *
 * Stored rather than left to the title because skincare genuinely splits into
 * two different routines a day, and the Сегодня list groups by it — "вечерний
 * уход" showing up at 8am is the exact confusion this prevents. "any" is for
 * everything that has no natural time.
 */
export type CareTime = "morning" | "evening" | "any";

/**
 * How often a routine is meant to be done.
 *
 * Deliberately the same three shapes as HabitSchedule, mapped onto the same
 * three columns — a routine *is* a habit about the body, and giving this
 * section its own subtly different calendar would mean "по будням" could
 * disagree between two screens of the same app.
 */
export type CareSchedule =
  | { kind: "daily" }
  | { kind: "weekdays"; weekdayMask: number }
  | { kind: "weekly"; timesPerWeek: number };

export type CareScheduleKind = CareSchedule["kind"];

/**
 * One line of a routine's checklist.
 *
 * `log` is the raw history of days this step was ticked, and `createdDay` is
 * what stops a step added today from making every past day look unfinished —
 * completion is derived from steps (see doneOn in lib/stats.ts), so each step
 * only counts for days it actually existed on.
 */
export interface CareStepItem {
  id: string;
  title: string;
  position: number;
  /** Resolved in the user's timezone server-side — the client has no zone. */
  createdDay: CalendarDay;
  /** Days ticked, ascending, inside the loaded window only. */
  log: CalendarDay[];
}

/**
 * A care procedure as the client sees it.
 *
 * Like HabitItem, nothing derived travels with it: streaks, adherence and this
 * week's progress are all computed from `steps[].log` and `log` at render time
 * by lib/stats.ts. That is also what lets ticking be optimistic — the cache
 * gains one string and the ring, the streak and the calendar all move on the
 * same frame.
 *
 * `log` carries this routine's *own* completion days and is only ever written
 * for a routine with no checklist. When `steps` is non-empty the step logs are
 * the record; see the note on AppearanceRoutineLog in schema.prisma.
 */
export interface CareRoutineItem {
  id: string;
  title: string;
  note: string | null;
  area: CareArea;
  timeOfDay: CareTime;
  schedule: CareSchedule;
  /** ISO instant — stable ordering only, never day arithmetic. */
  createdAt: string;
  createdDay: CalendarDay;
  /** ISO instant, or null while the routine is active. */
  archivedAt: string | null;
  steps: CareStepItem[];
  /** Days completed. Empty by construction for a routine that has steps. */
  log: CalendarDay[];
}

/**
 * A progress photo, without its bytes.
 *
 * `thumbData` is a small data: URI and is what the gallery grid renders. The
 * full image is deliberately absent: shipping every photo at full resolution
 * with the section snapshot is what would make this screen unusable on mobile
 * data, so it is fetched one at a time by getAppearancePhotoAction.
 */
export interface CarePhotoItem {
  id: string;
  area: CareArea;
  day: CalendarDay;
  note: string | null;
  /** data: URI, ~256px longest side. */
  thumbData: string;
  /** Pixel dimensions of the *full* image, so a viewer can reserve space. */
  width: number;
  height: number;
  createdAt: string;
  /**
   * The stored AI reading, or null if this photo has never been analysed.
   *
   * Carried in the snapshot unlike `imageData`: an analysis is a couple of
   * kilobytes of text against a ten-kilobyte thumbnail that already travels
   * here, and having it up front is what lets the gallery mark analysed photos
   * and the viewer open on a result instead of on a button.
   */
  analysis: AppearanceAnalysis | null;
  /** ISO timestamp of that analysis. Null whenever `analysis` is null. */
  analyzedAt: string | null;
}

/** One photo's full-resolution bytes, fetched on demand. */
export interface CarePhotoImage {
  id: string;
  imageData: string;
}

/**
 * A goal about how the user wants to look.
 *
 * No steps of its own — the routines are the steps, which is the point of a
 * section where the work is repeated care rather than a checklist you finish
 * once. Progress is therefore not a percentage here; it is the adherence of
 * the routines in the same area, computed in lib/stats.ts.
 */
export interface CareGoalItem {
  id: string;
  title: string;
  note: string | null;
  area: CareArea;
  targetDate: CalendarDay | null;
  isCompleted: boolean;
  /** ISO instant, or null while open. */
  completedAt: string | null;
  createdAt: string;
  createdDay: CalendarDay;
}

/**
 * One fetch of the Внешность screen.
 *
 * `windowStart` is the horizon of every log in here: history is bounded, so a
 * routine kept for years still ships one bounded array. Anything measured over
 * it is labelled with the window in the UI rather than passed off as all-time.
 *
 * `gender` travels because it decides whether the beard area is offered at all.
 * It is read from the profile server-side rather than guessed, and it only ever
 * gates what the *form* shows — never what renders.
 */
export interface AppearanceSnapshot {
  today: CalendarDay;
  windowStart: CalendarDay;
  /** "male" | "female" | "other", straight from the profile. */
  gender: string;
  routines: CareRoutineItem[];
  photos: CarePhotoItem[];
  goals: CareGoalItem[];
}
