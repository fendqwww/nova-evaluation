import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { LifeScoreResult } from "@/features/life-score/types";
import type { PlanId } from "@/features/settings/types";
import type {
  GenderValue,
  OccupationValue,
  PrimaryGoalValue,
} from "@/features/onboarding/schemas";

/** The identity block at the top of the screen. */
export interface ProfileAccount {
  /** The name chosen during onboarding — what the app calls the user. */
  name: string;
  /** What Telegram supplies. Often different, so both are shown. */
  telegramName: string;
  username: string | null;
  photoUrl: string | null;
  /** ISO instant the account was created. */
  createdAt: string;
  /** Whole days since registration — "в Nova 42 дня". */
  daysWithNova: number;
  plan: PlanId;
}

/**
 * Lifetime counters.
 *
 * Every one of these is a COUNT over rows that already exist, never a stored
 * tally — the same rule the rest of the app follows (no cached percentages, no
 * snapshot tables). Un-ticking a habit day therefore lowers this number, which
 * is correct: it is a count of what is true now, not of what was ever clicked.
 */
export interface ProfileTotals {
  /** Habit days ticked, all time. */
  habitTicks: number;
  tasksCompleted: number;
  goalsCompleted: number;
  /** Finished sessions. An open session is not a workout that happened. */
  workouts: number;
  /** Distinct days with at least one meal logged. */
  nutritionDays: number;
  /** Care routines completed, derived by the same rule the section uses. */
  careDone: number;
  photos: number;
}

/** What is currently in flight — the "Активность" counters. */
export interface ProfileCounts {
  goalsActive: number;
  habitsActive: number;
  tasksOpen: number;
  workoutsActive: number;
}

/**
 * One day of the activity chart.
 *
 * `count` is the number of things the user did that day across every section —
 * a habit tick, a closed task, a finished workout, a logged meal, a completed
 * routine. Deliberately one number rather than a stack per section: the chart
 * answers "was this a day you showed up", and five colours would make it a
 * report instead of a rhythm.
 */
export interface ActivityDay {
  day: CalendarDay;
  count: number;
}

/**
 * How many days in a row the user has shown up.
 *
 * "Showed up" means any activity at all, in any section — the same union the
 * chart is built from. It is deliberately not a habit streak: a habit's own
 * streak already lives on its card and means something narrower.
 *
 * `current` tolerates an empty today: a user who opens the app before doing
 * anything should not be told their streak is 0 at 9am. Today counts if
 * anything happened, otherwise the count runs back from yesterday, and the flag
 * says which of the two it is so the UI can nudge honestly.
 */
export interface ProfileStreak {
  current: number;
  best: number;
  isTodayActive: boolean;
}

/**
 * The data the AI Coach actually reasons over.
 *
 * Not a settings form and not editable here — the point of the card is that a
 * user can see what the model is told about them before it says anything. Every
 * field comes from the same analysis the Coach itself is handed, which is what
 * makes the card a true statement rather than a plausible-looking summary.
 */
export interface AiProfileFacts {
  age: number;
  heightCm: number;
  weightKg: number;
  gender: GenderValue;
  bmi: number;
  bmiLabel: string;
  occupation: OccupationValue;
  primaryGoal: PrimaryGoalValue;
  timezone: string;
  /** Titles of the goals still open — what the Coach treats as direction. */
  activeGoalTitles: string[];
  /** False when the user has switched the Coach off in Настройки. */
  isCoachEnabled: boolean;
}

/** One fetch of the Профиль screen. */
export interface ProfileOverview {
  today: CalendarDay;
  account: ProfileAccount;
  /** The same score the Dashboard shows — literally the same computation. */
  lifeScore: LifeScoreResult;
  streak: ProfileStreak;
  totals: ProfileTotals;
  counts: ProfileCounts;
  /** Newest last, one entry per day, gaps filled with zeros. */
  activity: ActivityDay[];
  ai: AiProfileFacts;
}
