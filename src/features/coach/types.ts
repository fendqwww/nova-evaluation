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
 * (the deterministic composer in lib/compose.ts and the Gemini call in
 * ai/coach.ts) are interchangeable. That interchangeability is the point:
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
  | "sleep"
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

/**
 * One thing the Coach knows about the user between conversations.
 *
 * See the CoachMemory model in schema.prisma for why this exists at all: the
 * transcript is what was said, this is what was learned, and only the second
 * one is short enough to travel with every prompt a month later.
 */
export interface CoachMemoryItem {
  key: string;
  kind: CoachMemoryKind;
  value: string;
  updatedAt: string;
}

export type CoachMemoryKind =
  | "preference"
  | "dislike"
  | "goal"
  | "constraint"
  | "context";

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

/**
 * When the conversation is happening, in the user's own terms.
 *
 * The Coach used to get a bare `localHour` and a "YYYY-MM-DD", which is enough
 * to greet someone and nothing else: "сегодня среда, рабочий день" and
 * "сегодня суббота" are different advice, and a model handed an ISO date has
 * to guess the weekday to tell them apart. Resolved server-side for the same
 * reason `today` is — the client's clock is not the authority on which day it
 * is for this user.
 */
export interface CoachClockFacts {
  /** "понедельник" … "воскресенье". */
  weekdayName: string;
  /** "3 августа 2026". */
  dateLabel: string;
  isWeekend: boolean;
  /** Local hour 0–23. */
  localHour: number;
  /** "ночь" | "утро" | "день" | "вечер". */
  partOfDay: string;
  /** Days since the account was created — how long Nova has known them. */
  daysWithNova: number;
}

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
  /**
   * What was actually eaten today, one line per meal that has entries.
   *
   * The one place the Coach sees food by name rather than as a calorie total,
   * and the difference between "ты недобрал 600 ккал" and "ужин — только
   * творог 150 г, отсюда и недобор". Capped and formatted server-side; an
   * empty array is a day with nothing logged, which is its own answer.
   */
  todayMeals: CoachMealLine[];
  /** Mean calories over the days of the last 7 that have entries. 0 when none. */
  averageCaloriesWeek: number;
  /** The same figure for days 8–14 back, so "стал есть больше" is measurable. */
  averageCaloriesPrevWeek: number;
  /** Mean protein over the logged days of the last 7, in grams. */
  averageProteinWeekG: number;
  /** Mean water over the last 7 days, in millilitres — including dry days. */
  averageWaterWeekMl: number;
  /** Days of the last 7 whose calories landed within ±10% of the goal. */
  daysOnTargetWeek: number;
}

/** One meal of today's diary, already written out: "Завтрак: овсянка 80 г". */
export interface CoachMealLine {
  slot: string;
  text: string;
  calories: number;
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

/**
 * How sleep is going, for the Coach.
 *
 * Thin like CoachNutritionFact rather than schedule-shaped like
 * CoachWorkoutFact: a night is logged or it is not, and there is no "owed"
 * figure to divide by — the 8h target is a number to aim at, not a schedule.
 * `hasLogs` is what tells the composer the difference between "спит плохо"
 * and "ещё ни разу не записывал", which are entirely different answers.
 */
export interface CoachSleepFact {
  hasLogs: boolean;
  /** Minutes, averaged over the nights logged this week. 0 when none. */
  averageDurationMin: number;
  /** 1–5, averaged over the same nights. 0 when none. */
  averageQuality: number;
  /** Nights logged within the trailing scoring window. */
  daysLoggedWeek: number;
  /** Consecutive days up to today with a logged night. */
  streak: number;
  /** Last night's duration in minutes, or null when it was not logged. */
  lastNightMin: number | null;
  /** The target every figure here is measured against. 8 hours. */
  goalMin: number;
  /** Last night's 1–5 rating, bedtime and wake time, when it was logged. */
  lastNightQuality: number | null;
  lastNightBedTime: string | null;
  lastNightWakeTime: string | null;
  /**
   * Trailing seven days rather than the calendar week `averageDurationMin`
   * uses — the two disagree by design, and only this one can be compared
   * against the seven before it. On Monday morning a calendar-week average is
   * one night; this is still seven, which is what makes "ниже твоей нормы" a
   * statement about a norm.
   */
  average7dMin: number;
  /** The same figure for days 8–14 back. 0 when nothing was logged then. */
  averagePrev7dMin: number;
  /** Σ of what each logged night of the last 7 fell short of the goal. */
  debtWeekMin: number;
  /** Nights of the last 7 that reached the goal. */
  nightsOnTargetWeek: number;
  /**
   * Spread between the earliest and latest bedtime of the last 7 nights, in
   * minutes. The one honest measure of regularity this section can produce —
   * a person averaging 7h30m on a two-hour swing is not sleeping the way the
   * average makes it sound.
   */
  bedTimeSpreadMin: number | null;
  /** The last seven nights, oldest first. Absent nights are simply not here. */
  recentNights: CoachSleepNight[];
}

export interface CoachSleepNight {
  day: CalendarDay;
  durationMin: number;
  quality: number;
  bedTime: string;
  wakeTime: string;
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

/** One finished session, as history rather than as a programme. */
export interface CoachSessionFact {
  day: CalendarDay;
  title: string;
  volumeKg: number;
  setsCount: number;
}

/** This week against the week before it. Percentages are 0–100, not 0–1. */
export interface CoachTrendPair {
  current: number;
  previous: number;
}

/**
 * Direction, not position.
 *
 * `yesterday` answers "что изменилось со вчера", which is a day of noise;
 * these answer "куда всё движется", which is the question a coach is actually
 * for. Every pair is the trailing seven days against the seven before them,
 * measured by the same repository functions that score the current week — so a
 * trend can never disagree with the metric it is a trend of.
 */
export interface CoachTrends {
  habitAdherencePercent: CoachTrendPair;
  workoutsDone: CoachTrendPair;
  tasksCompleted: CoachTrendPair;
  nutritionDaysLogged: CoachTrendPair;
  /** Mean minutes slept per logged night. */
  sleepAverageMin: CoachTrendPair;
}

export interface CoachAnalysis {
  today: CalendarDay;
  clock: CoachClockFacts;
  profile: CoachProfileFacts;
  metrics: CoachMetrics;
  /** Yesterday's metrics, or null when the account did not exist yet. */
  yesterday: CoachMetrics | null;
  trends: CoachTrends;
  habits: CoachHabitFact[];
  tasks: CoachTaskFact[];
  goals: CoachGoalFact[];
  workouts: CoachWorkoutFact[];
  /** The last few finished sessions, newest first. */
  recentSessions: CoachSessionFact[];
  /** Days since the last finished session, null when there has never been one. */
  daysSinceLastWorkout: number | null;
  nutrition: CoachNutritionFact;
  appearance: CoachAppearanceFact;
  sleep: CoachSleepFact;
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
export type CoachAnswerSource = "gemini" | "rules";

export interface CoachOverview {
  today: CalendarDay;
  greeting: string;
  analysis: CoachAnalysis;
  /** Today's headline analysis — the thing the first screen leads with. */
  brief: CoachAnswer;
  /** Which producer wrote that brief. Deterministic until the model replaces it. */
  briefSource: CoachAnswerSource;
  /**
   * True when today's AI briefing has not been written yet and still could be.
   * The screen uses it to decide whether to ask for one — a single call per
   * day, never on a screen that already has the model's version.
   */
  canWriteBrief: boolean;
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
