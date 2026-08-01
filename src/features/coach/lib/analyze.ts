import { calculateLifeScore } from "@/features/life-score/server/calculate-life-score";
import type { LifeScoreInput } from "@/features/life-score/types";
import type {
  CoachHabitFact,
  CoachPotential,
  CoachTaskFact,
  CoachWorkoutFact,
} from "@/features/coach/types";

/**
 * Pure derivations shared by the analysis builder and the composer.
 *
 * Nothing here reads the database or the clock — every function takes the facts
 * it needs, which is what lets the composer run the same maths the server did
 * without a second round trip.
 */

export function bmiOf(heightCm: number, weightKg: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function bmiLabel(bmi: number): string {
  if (bmi === 0) return "нет данных";
  if (bmi < 18.5) return "недостаточный вес";
  if (bmi < 25) return "норма";
  if (bmi < 30) return "избыточный вес";
  return "ожирение";
}

/** The verdict the Life Score card shows, so the Coach never contradicts it. */
export function scoreVerdict(score: number): string {
  if (score >= 80) return "отличное состояние";
  if (score >= 60) return "хорошее состояние";
  if (score >= 40) return "есть куда расти";
  return "пока низкий старт";
}

export function greetingFor(hour: number, firstName: string): string {
  if (hour >= 5 && hour < 12) return `Доброе утро, ${firstName}`;
  if (hour >= 12 && hour < 18) return `Добрый день, ${firstName}`;
  if (hour >= 18 && hour < 23) return `Добрый вечер, ${firstName}`;
  return `Доброй ночи, ${firstName}`;
}

/**
 * What today is still worth, in real points.
 *
 * Each figure is calculateLifeScore re-run with exactly one input changed, so
 * "+4" is the number the ring will move by rather than a guess dressed up as
 * one. `total` re-runs it once more with every change at once instead of
 * summing the parts: the habits, tasks, workout and appearance blocks all
 * saturate, so the sum would over-promise for a user already near the cap on
 * any of them.
 */
export function computePotential(
  base: LifeScoreInput,
  habitsRemaining: number,
  overdueTasks: number,
  workoutsRemaining: number,
  canLogNutritionToday: boolean,
  appearanceRemaining: number,
): CoachPotential {
  const current = calculateLifeScore(base).score;

  const withHabits: LifeScoreInput = {
    ...base,
    habits: {
      ...base.habits,
      done: Math.min(base.habits.expected, base.habits.done + habitsRemaining),
    },
  };

  const withoutOverdue: LifeScoreInput = {
    ...base,
    tasks: { ...base.tasks, overdue: 0 },
  };

  const withOneTask: LifeScoreInput = {
    ...base,
    tasks: {
      ...base.tasks,
      completed: base.tasks.completed + 1,
      open: Math.max(0, base.tasks.open - 1),
    },
  };

  const withWorkouts: LifeScoreInput = {
    ...base,
    workouts: {
      ...base.workouts,
      done: Math.min(base.workouts.expected, base.workouts.done + workoutsRemaining),
    },
  };

  const withNutrition: LifeScoreInput = {
    ...base,
    nutrition: {
      ...base.nutrition,
      daysLogged: Math.min(base.nutrition.expected, base.nutrition.daysLogged + 1),
    },
  };

  const withAppearance: LifeScoreInput = {
    ...base,
    appearance: {
      ...base.appearance,
      done: Math.min(base.appearance.expected, base.appearance.done + appearanceRemaining),
    },
  };

  const withEverything: LifeScoreInput = {
    ...base,
    habits: withHabits.habits,
    workouts: withWorkouts.workouts,
    nutrition: withNutrition.nutrition,
    appearance: withAppearance.appearance,
    tasks: {
      open: Math.max(0, base.tasks.open - overdueTasks),
      completed: base.tasks.completed + Math.max(overdueTasks, 1),
      overdue: 0,
    },
  };

  const gain = (input: LifeScoreInput) =>
    Math.max(0, calculateLifeScore(input).score - current);

  return {
    fromHabits: habitsRemaining > 0 ? gain(withHabits) : 0,
    fromOverdueTasks: overdueTasks > 0 ? gain(withoutOverdue) : 0,
    fromOneTask: gain(withOneTask),
    fromWorkouts: workoutsRemaining > 0 ? gain(withWorkouts) : 0,
    fromNutrition: canLogNutritionToday ? gain(withNutrition) : 0,
    fromAppearance: appearanceRemaining > 0 ? gain(withAppearance) : 0,
    total: gain(withEverything),
  };
}

/**
 * Habits ordered worst-first: what a user should fix before anything else.
 *
 * Adherence leads, and a habit due today but not yet kept outranks an equally
 * weak one that owes nothing today — the second is a trend, the first is
 * something that can still be fixed in the next few hours.
 */
export function weakestHabits(habits: CoachHabitFact[], limit: number): CoachHabitFact[] {
  return [...habits]
    .sort((a, b) => {
      const owedNow = Number(b.isDueToday && !b.isDoneToday) - Number(a.isDueToday && !a.isDoneToday);
      if (owedNow !== 0) return owedNow;
      const byAdherence = a.adherence - b.adherence;
      if (byAdherence !== 0) return byAdherence;
      return a.currentStreak - b.currentStreak;
    })
    .slice(0, limit);
}

export function strongestHabit(habits: CoachHabitFact[]): CoachHabitFact | null {
  if (habits.length === 0) return null;
  return [...habits].sort(
    (a, b) => b.currentStreak - a.currentStreak || b.adherence - a.adherence,
  )[0];
}

/**
 * Tasks in the order they should actually be picked up.
 *
 * Overdue first and by how far, then today's, then high priority — the same
 * ordering the Tasks screen groups by, so the Coach never recommends something
 * the list has buried.
 */
const PRIORITY_WEIGHT = { high: 0, normal: 1, low: 2 } as const;

/**
 * The workout worth naming: what is owed today first, then whatever has slipped
 * furthest. A user with five programmes does not need a list, they need the one
 * to do next.
 */
export function focusWorkout(workouts: CoachWorkoutFact[]): CoachWorkoutFact | null {
  if (workouts.length === 0) return null;

  return [...workouts].sort((a, b) => {
    const openNow = Number(b.isOpenToday) - Number(a.isOpenToday);
    if (openNow !== 0) return openNow;

    const owedNow =
      Number(b.isPlannedToday && !b.isDoneToday) - Number(a.isPlannedToday && !a.isDoneToday);
    if (owedNow !== 0) return owedNow;

    // A workout with no plan owes nothing, so it never outranks one that does.
    const byAdherence = (a.adherence ?? 1) - (b.adherence ?? 1);
    if (byAdherence !== 0) return byAdherence;

    return a.currentStreak - b.currentStreak;
  })[0];
}

export function urgentTasks(tasks: CoachTaskFact[], limit: number): CoachTaskFact[] {
  return [...tasks]
    .sort((a, b) => {
      if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
      const dueToday = Number(b.isDueToday) - Number(a.isDueToday);
      if (dueToday !== 0) return dueToday;
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    })
    .slice(0, limit);
}
