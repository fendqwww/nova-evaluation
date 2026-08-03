import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { LifeScoreResult } from "@/features/life-score/types";
import type { CoachAnswer } from "@/features/coach/types";

/** One day inside the loaded window, for the Weekly/Monthly charts. */
export interface ReportsDayPoint {
  day: CalendarDay;
  habitsDone: number;
  tasksCompleted: number;
  workoutsDone: number;
  workoutVolumeKg: number;
  nutritionCalories: number;
  waterMl: number;
  sleepDurationMin: number;
}

export interface ReportsHabitRow {
  id: string;
  title: string;
  /** 0–1 over the trailing 30 days. */
  adherence: number;
  currentStreak: number;
  streakUnit: "day" | "week";
}

export interface ReportsGoalRow {
  id: string;
  title: string;
  percent: number;
  daysLeft: number | null;
}

/**
 * Everything the Отчёты screen shows, assembled in one fetch.
 *
 * The scored figures (lifeScore, habits, tasks, goals, workouts, nutrition,
 * appearance) are read straight from buildCoachAnalysis — the same function
 * the Dashboard and the Coach use — so this screen can never disagree with
 * either about what the Life Score is or what is owed today. `series` is the
 * one thing Reports computes for itself: a 30-day daily breakdown no other
 * screen needs, built in get-reports.action.ts from each section's own raw
 * rows.
 */
export interface ReportsSnapshot {
  today: CalendarDay;
  windowStart: CalendarDay;
  series: ReportsDayPoint[];

  lifeScore: LifeScoreResult;

  habits: {
    activeCount: number;
    dueToday: number;
    doneToday: number;
    adherenceWeek: number;
    top: ReportsHabitRow[];
  };
  tasks: {
    open: number;
    overdue: number;
    completedWeek: number;
  };
  goals: {
    active: number;
    completed: number;
    items: ReportsGoalRow[];
  };
  workouts: {
    weekDone: number;
    volumeWeekKg: number;
    adherenceWeek: number;
  };
  nutrition: {
    hasGoal: boolean;
    caloriesToday: number;
    caloriesGoal: number;
    waterTodayMl: number;
    waterGoalMl: number;
    daysLoggedWeek: number;
    streak: number;
  };
  sleep: {
    hasLogs: boolean;
    averageDurationMin: number;
    averageQuality: number;
    daysLoggedWeek: number;
    streak: number;
  };
  appearance: {
    activeCount: number;
    dueToday: number;
    doneToday: number;
    streak: number;
    weakestArea: string | null;
    adherenceWeek: number | null;
  };
  profile: {
    heightCm: number;
    weightKg: number;
    bmi: number;
    bmiLabel: string;
  };

  /** The deterministic brief — always available, the same composer the
   *  Dashboard and Coach fall back to. See ReportsAiSummaryCard for the
   *  on-demand Gemini upgrade. */
  aiSummary: CoachAnswer;
  aiUsage: { used: number; limit: number | null };
}
