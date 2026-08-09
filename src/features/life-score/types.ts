export interface LifeScoreBreakdownItem {
  key: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface LifeScoreResult {
  score: number;
  breakdown: LifeScoreBreakdownItem[];
}

/** Habit adherence over the trailing window — see getHabitAdherence. */
export interface LifeScoreHabits {
  /** Habits currently tracked. Archived ones owe nothing and are excluded. */
  activeCount: number;
  /** Ticks the schedules asked for, clipped to each habit's creation day. */
  expected: number;
  /** Ticks actually made. */
  done: number;
}

/** Task throughput over the trailing window — see getTaskThroughput. */
export interface LifeScoreTasks {
  open: number;
  completed: number;
  /** Open tasks whose due date has already passed. */
  overdue: number;
}

/**
 * Training over the trailing window — see getWorkoutAdherence.
 *
 * Deliberately the same shape as LifeScoreHabits, because it answers the same
 * question: how much of what was owed actually happened. A workout with no
 * declared plan still contributes an expected figure (a prorated baseline), so
 * "тренируюсь когда получится" is measured rather than exempt.
 */
export interface LifeScoreWorkouts {
  /** Workouts currently tracked. Archived ones owe nothing and are excluded. */
  activeCount: number;
  /** Sessions the plans asked for, clipped to each workout's creation day. */
  expected: number;
  /** Sessions actually completed. */
  done: number;
}

/**
 * Nutrition logging over the trailing window — see getNutritionAdherence.
 *
 * Shaped like LifeScoreHabits/LifeScoreWorkouts but answers a narrower
 * question: not whether the calorie target was hit, but whether the diary was
 * kept at all. `hasGoal` is what tells scoreNutrition a user with no goal set
 * owes nothing, the same way an empty habit list owes nothing rather than
 * scoring a vacuous 100%.
 */
export interface LifeScoreNutrition {
  hasGoal: boolean;
  /** Days in the trailing window the goal existed for. */
  expected: number;
  /** Days at least one entry was logged. */
  daysLogged: number;
}

/**
 * Care routines over the trailing window — see getAppearanceAdherence.
 *
 * The same shape as LifeScoreHabits and LifeScoreWorkouts because it answers
 * the same question: how much of what was owed actually happened. Unlike
 * nutrition, there is a real "owed" figure here — a routine carries a schedule,
 * so "вечерний уход каждый день" is a countable obligation rather than a target
 * to aim at.
 */
export interface LifeScoreAppearance {
  /** Routines currently tracked. Archived ones owe nothing and are excluded. */
  activeCount: number;
  /** Completions the schedules asked for, clipped to each creation day. */
  expected: number;
  /** Completions that actually happened. */
  done: number;
}

/**
 * Goals are still counted rather than measured, and that is deliberate: a goal
 * is a months-long thing, so "how many are in flight" is a fair read of
 * engagement in a way it is not for a habit or a task. Habits and tasks now
 * carry evidence instead — see the note in calculate-life-score.ts.
 */
/**
 * Sleep over the trailing window — see sleepAdherence.
 *
 * Two signals rather than one, because sleep fails in two different ways and a
 * single average hides both: `nightsLogged` is whether the section is being
 * used at all, and `debtMin` is how far short of the personal norm those nights
 * actually fell. A week of five perfect nights and two unlogged ones is a
 * different thing from seven logged four-hour nights, and one number cannot
 * tell them apart.
 */
export interface LifeScoreSleep {
  /** Nights logged in the window. Zero means the section is unused. */
  nightsLogged: number;
  /** Nights the window asked for — the window length, clipped to signup. */
  expected: number;
  /** Total minutes short of the personal norm across those nights. */
  debtMin: number;
  /** The norm the debt was measured against, for the falloff to scale with. */
  normMin: number;
}

export interface LifeScoreInput {
  hasCompletedProfile: boolean;
  heightCm: number | null;
  weightKg: number | null;
  goalsCount: number;
  habits: LifeScoreHabits;
  tasks: LifeScoreTasks;
  workouts: LifeScoreWorkouts;
  nutrition: LifeScoreNutrition;
  appearance: LifeScoreAppearance;
  sleep: LifeScoreSleep;
}
