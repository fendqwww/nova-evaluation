import type { CalendarDay } from "@/shared/lib/calendar-day";

/**
 * What kind of training a workout is.
 *
 * A closed union rather than free-form tags: the category drives the icon, the
 * tint and the way statistics are grouped, and a list of user-invented strings
 * would make all three unstable. Stored as a plain String column (SQLite has no
 * enums) and validated by a zod union — the same arrangement Task.priority uses.
 */
export type WorkoutCategory =
  | "strength"
  | "cardio"
  | "hiit"
  | "mobility"
  | "sport"
  | "other";

/**
 * One planned exercise: the target, never the result.
 *
 * `targetWeightKg` is null for bodyweight or unprescribed work. Zero would be a
 * different claim — an empty bar — and the distinction matters the moment a
 * volume figure is computed from it.
 *
 * An archived exercise is no longer part of the plan but is still the anchor
 * for every set ever logged against it, which is why it travels to the client
 * rather than being filtered out server-side: the history modal has to be able
 * to name what was performed. See the note on WorkoutExercise in schema.prisma.
 */
export interface WorkoutExerciseItem {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number | null;
  restSeconds: number;
  note: string | null;
  /** Explicit, because the order of exercises is part of the plan. */
  position: number;
  /** ISO instant, or null while the exercise is part of the plan. */
  archivedAt: string | null;
}

/** One set actually performed. Absence of a row is the "not done" state. */
export interface WorkoutSetItem {
  exerciseId: string;
  /** 0-based index of this set within its exercise, for this session. */
  position: number;
  reps: number;
  /** 0 for bodyweight — a real answer, not a missing one. */
  weightKg: number;
}

/**
 * One performance of a workout on one day.
 *
 * `completedAt` null means the session is open: started and still being logged.
 * That state is persisted rather than kept in component state so closing the
 * app mid-workout loses nothing.
 *
 * Nothing derived is carried: volume, tonnage, set counts and completion are
 * all computed from `sets` by lib/stats.ts at the point of display, for the
 * same reason HabitItem ships its log instead of its streak.
 */
export interface WorkoutSessionItem {
  id: string;
  workoutId: string;
  day: CalendarDay;
  /** ISO instant of completion, or null while the session is open. */
  completedAt: string | null;
  note: string | null;
  sets: WorkoutSetItem[];
}

/**
 * A workout as the client sees it — the plan, not its history.
 *
 * Sessions live beside workouts in the snapshot rather than nested inside them:
 * the history list, the calendar and the statistics card all read across every
 * workout at once, and a per-workout nesting would have every one of them
 * flattening the same array again.
 */
export interface WorkoutItem {
  id: string;
  title: string;
  note: string | null;
  category: WorkoutCategory;
  /** Bit 0 = Monday … bit 6 = Sunday. 0 means no fixed plan. */
  weekdayMask: number;
  /** ISO instant — used for stable ordering, not for day arithmetic. */
  createdAt: string;
  /**
   * The calendar day the workout was created, resolved in the user's timezone
   * server-side. Stats need it so a workout added yesterday is not scored
   * against a month of days before it existed.
   */
  createdDay: CalendarDay;
  /** ISO instant, or null while the workout is active. */
  archivedAt: string | null;
  /** Ordered by position; archived ones sort last. */
  exercises: WorkoutExerciseItem[];
}

/**
 * One fetch of the Тренировки screen.
 *
 * `today` is resolved from the profile timezone server-side, for the same
 * reason HabitsSnapshot carries it: which day a session belongs to is not a
 * question the device clock gets to answer.
 *
 * `windowStart` is the horizon of `sessions`. History is loaded for a bounded
 * window so a user training for three years does not ship every set they have
 * ever done; anything measured over it is labelled with the window in the UI
 * rather than passed off as all-time.
 */
export interface WorkoutsSnapshot {
  today: CalendarDay;
  windowStart: CalendarDay;
  workouts: WorkoutItem[];
  /** Every session in the window, across all workouts, ascending by day. */
  sessions: WorkoutSessionItem[];
}
