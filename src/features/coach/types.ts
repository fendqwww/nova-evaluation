import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { LifeScoreResult } from "@/features/life-score/types";
import type { TaskPriority } from "@/features/tasks/types";
import type {
  GenderValue,
  OccupationValue,
  PrimaryGoalValue,
} from "@/features/onboarding/schemas";

/**
 * The Coach speaks in cards, not paragraphs.
 *
 * Every answer — the daily brief, a quick action, a typed question — is the
 * same CoachAnswer shape, so the renderer is written once and the two producers
 * (the deterministic composer in lib/compose.ts and the Claude call in
 * server/claude.ts) are interchangeable. That interchangeability is the point:
 * the model is a narrator over facts this module already computed, never the
 * source of the facts, so a missing API key downgrades the prose and nothing
 * else.
 */
export type CoachBulletTone = "positive" | "warning" | "critical" | "neutral";

export interface CoachBullet {
  id: string;
  tone: CoachBulletTone;
  text: string;
}

/** Where an action sends the user. `null` is advice with nowhere to tap. */
export type CoachActionTarget =
  | "goals"
  | "habits"
  | "tasks"
  | "workouts"
  | "nutrition"
  | "appearance";

export interface CoachAction {
  id: string;
  label: string;
  target: CoachActionTarget | null;
}

export interface CoachAnswer {
  /** One line, the verdict. Always present. */
  headline: string;
  /** One to three sentences under it. */
  body: string;
  bullets: CoachBullet[];
  actions: CoachAction[];
}

export type CoachMessageRole = "user" | "coach";

export interface CoachMessageItem {
  id: string;
  role: CoachMessageRole;
  /**
   * Plain text, always renderable. For a coach turn this is the headline and
   * body joined, so a payload that fails to parse still shows the answer
   * rather than an empty bubble.
   */
  text: string;
  /** The structured card, when the row carried a parseable payload. */
  answer: CoachAnswer | null;
  day: CalendarDay;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

export interface CoachProfileFacts {
  firstName: string;
  age: number;
  heightCm: number;
  weightKg: number;
  /** Rounded to one decimal. */
  bmi: number;
  bmiLabel: string;
  gender: GenderValue;
  primaryGoal: PrimaryGoalValue;
  occupation: OccupationValue;
  timezone: string;
  /** Local hour 0–23, resolved from the profile timezone server-side. */
  localHour: number;
}

export interface CoachHabitFact {
  id: string;
  title: string;
  /** "Каждый день", "Пн, Ср, Пт", "3 раза в неделю". */
  schedule: string;
  isDueToday: boolean;
  isDoneToday: boolean;
  currentStreak: number;
  streakUnit: "day" | "week";
  /** 0–1 over the trailing 30 days. */
  adherence: number;
  weekDone: number;
  weekTarget: number;
}

export interface CoachTaskFact {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: CalendarDay | null;
  /** 0 when the task is not overdue. */
  daysOverdue: number;
  isDueToday: boolean;
}

export interface CoachWorkoutFact {
  id: string;
  title: string;
  /** "Силовая", "Кардио" — the category label, not the id. */
  category: string;
  /** "Пн, Ср, Пт", "Каждый день", "Без плана". */
  plan: string;
  hasPlan: boolean;
  isPlannedToday: boolean;
  isDoneToday: boolean;
  /** A session started today and not finished. */
  isOpenToday: boolean;
  currentStreak: number;
  streakUnit: "day" | "week";
  /** 0–1 over the trailing 30 days. Null when the workout has no plan. */
  adherence: number | null;
  weekDone: number;
  weekTarget: number;
  /** Last day it was completed, inside the loaded window. */
  lastDay: CalendarDay | null;
  /** Σ reps × weight across the window, in kilograms. */
  volumeKg: number;
}

/**
 * What today's diary looks like, for the Coach.
 *
 * Deliberately thin next to CoachWorkoutFact: there is no per-food breakdown
 * here, since the Coach reasons about whether the diary is being kept and
 * roughly how today compares to the target, not about a specific meal.
 */
export interface CoachNutritionFact {
  hasGoal: boolean;
  caloriesGoal: number;
  caloriesToday: number;
  proteinTodayG: number;
  fatTodayG: number;
  carbsTodayG: number;
  waterTodayMl: number;
  waterGoalMl: number;
  isLoggedToday: boolean;
  /** Consecutive days up to and including today with at least one entry. */
  loggingStreak: number;
  /** Days logged / days owed over the trailing scoring window, 0–1. Null without a goal. */
  adherence: number | null;
}

/**
 * How the care routines are going, for the Coach.
 *
 * Shaped like CoachWorkoutFact rather than CoachNutritionFact, because a
 * routine carries a schedule and therefore has a real "owed vs done" to talk
 * about — the Coach can say "вечерний уход пропущен три дня подряд" and be
 * right, which is not something it could say about a food diary.
 *
 * `weakestArea` is the one body part care is going worst in, already resolved
 * to a label — the Coach names it rather than listing seven percentages.
 */
export interface CoachAppearanceFact {
  activeCount: number;
  /** Routines the schedule owes today. */
  dueToday: number;
  doneToday: number;
  /** Consecutive days every due routine was completed. */
  streak: number;
  /** Done / owed over the trailing scoring window, 0–1. Null with no routines. */
  adherence: number | null;
  /** The routine most worth doing next, or null when nothing is owed. */
  nextTitle: string | null;
  /** "Кожа", "Зубы" — the label, not the id. Null when nothing is measurable. */
  weakestArea: string | null;
  /** Adherence in that area over the last month, 0–1. */
  weakestAreaAdherence: number | null;
  photosTotal: number;
  /** Days since the most recent photo, null when there are none. */
  daysSinceLastPhoto: number | null;
  goalsActive: number;
}

export interface CoachGoalFact {
  id: string;
  title: string;
  percent: number;
  remainingSteps: number;
  hasSteps: boolean;
  /** Whole days to the deadline, negative once passed, null without one. */
  daysLeft: number | null;
  isCompleted: boolean;
}

/**
 * The numbers a day is judged on.
 *
 * Computed for today and, identically, for yesterday — see
 * buildCoachSnapshot, which reconstructs a past day from HabitLog.date,
 * Task.completedAt and Task.createdAt rather than from a stored snapshot.
 */
export interface CoachMetrics {
  lifeScore: LifeScoreResult;
  habitsDue: number;
  habitsDone: number;
  habitsRemaining: number;
  /** Kept / owed over the trailing scoring window, 0–1. */
  habitAdherence: number;
  tasksOpen: number;
  tasksOverdue: number;
  tasksDueToday: number;
  tasksCompletedToday: number;
  /** Finished within the trailing scoring window. */
  tasksCompletedWeek: number;
  goalsActive: number;
  goalsCompleted: number;
  /** Workouts the plan asks for today. */
  workoutsPlannedToday: number;
  workoutsDoneToday: number;
  workoutsRemaining: number;
  /** Completed / owed over the trailing scoring window, 0–1. */
  workoutAdherence: number;
  /** Sessions completed within the trailing scoring window. */
  workoutsWeek: number;
  /** Σ volume of those sessions, in kilograms. */
  workoutVolumeWeek: number;
  /** Days logged / owed over the trailing scoring window, 0–1. */
  nutritionAdherence: number;
  /** Days logged within the trailing scoring window. */
  nutritionDaysWeek: number;
  /** Care routines the schedule owes today. */
  appearanceDueToday: number;
  appearanceDoneToday: number;
  appearanceRemaining: number;
  /** Completed / owed over the trailing scoring window, 0–1. */
  appearanceAdherence: number;
}

/**
 * What today's Life Score would gain from work that is still available today.
 *
 * Every field is a real re-run of calculateLifeScore with one input changed, so
 * "+4" is the number the ring will actually show — not an estimate. This is
 * what lets the Coach say "закончишь её сегодня — индекс вырастет на 4" and be
 * right.
 */
export interface CoachPotential {
  /** Keeping every habit still owed today. */
  fromHabits: number;
  /** Closing every overdue task. */
  fromOverdueTasks: number;
  /** Finishing one more task, whichever it is. */
  fromOneTask: number;
  /** Completing every workout the plan still owes today. */
  fromWorkouts: number;
  /** Logging at least one entry today, when it has not happened yet. */
  fromNutrition: number;
  /** Finishing every care routine still owed today. */
  fromAppearance: number;
  /** All of the above together — the honest ceiling for today. */
  total: number;
}

export interface CoachAnalysis {
  today: CalendarDay;
  profile: CoachProfileFacts;
  metrics: CoachMetrics;
  /** Yesterday's metrics, or null when the account did not exist yet. */
  yesterday: CoachMetrics | null;
  habits: CoachHabitFact[];
  tasks: CoachTaskFact[];
  goals: CoachGoalFact[];
  workouts: CoachWorkoutFact[];
  nutrition: CoachNutritionFact;
  appearance: CoachAppearanceFact;
  potential: CoachPotential;
}

// ---------------------------------------------------------------------------
// Daily report
// ---------------------------------------------------------------------------

export interface CoachReportRow {
  key: string;
  label: string;
  yesterday: number;
  today: number;
  /** today − yesterday. */
  delta: number;
  /** Whether a rising number is good news — overdue tasks are not. */
  higherIsBetter: boolean;
  format: "number" | "percent";
}

export interface CoachDailyReport {
  today: CalendarDay;
  yesterdayDay: CalendarDay;
  /** False on the account's first day — there is nothing to compare against. */
  hasYesterday: boolean;
  rows: CoachReportRow[];
  improved: string[];
  worsened: string[];
}

/**
 * The three standing sections of the daily analysis, separate from the brief.
 *
 * The brief argues one point; these are the running lists — what to do, what is
 * going wrong, and what is going right. Splitting them out is what lets the
 * screen show "Предупреждений нет" as a real, calm state rather than quietly
 * having nothing where a warning would be.
 */
export interface CoachSignals {
  recommendations: CoachBullet[];
  warnings: CoachBullet[];
  /** One line, always true, never a platitude. */
  motivation: string;
}

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

/** Which producer wrote an answer. Surfaced so the UI never has to guess. */
export type CoachAnswerSource = "claude" | "rules";

export interface CoachOverview {
  today: CalendarDay;
  greeting: string;
  analysis: CoachAnalysis;
  /** Today's headline analysis — the thing the first screen leads with. */
  brief: CoachAnswer;
  signals: CoachSignals;
  report: CoachDailyReport;
  /** Newest-last, so the chat reads top to bottom. */
  history: CoachMessageItem[];
  /** True when more history exists above what was sent. */
  hasMoreHistory: boolean;
}

export interface CoachAskResult {
  question: CoachMessageItem;
  reply: CoachMessageItem;
  source: CoachAnswerSource;
}

export interface CoachHistoryPage {
  messages: CoachMessageItem[];
  hasMore: boolean;
}
