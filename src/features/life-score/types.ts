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
 * Goals are still counted rather than measured, and that is deliberate: a goal
 * is a months-long thing, so "how many are in flight" is a fair read of
 * engagement in a way it is not for a habit or a task. Habits and tasks now
 * carry evidence instead — see the note in calculate-life-score.ts.
 */
export interface LifeScoreInput {
  hasCompletedProfile: boolean;
  heightCm: number | null;
  weightKg: number | null;
  goalsCount: number;
  habits: LifeScoreHabits;
  tasks: LifeScoreTasks;
}
