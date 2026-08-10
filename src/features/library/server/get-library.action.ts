"use server";

import { requireUserContext } from "@/server/auth/current-user";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { LIBRARY_BOOKS } from "@/features/library/content/books";
import { detectProblems } from "@/features/library/lib/problems";
import { recommendBooks } from "@/features/library/lib/recommend";
import type { LibrarySnapshot } from "@/features/library/types";

/**
 * Библиотека с персональной рекомендацией.
 *
 * Сигналы берутся из CoachAnalysis — того же снимка, на котором стоят коуч,
 * главный экран, профиль и путь. Второго измерителя быть не должно: раздел,
 * который считает недосып по-своему, однажды назовёт проблемой то, чего карточка
 * «Сон» на главной не видит.
 *
 * Ни одного вызова модели, и это не компромисс: объяснение «почему эта книга
 * нужна тебе» опирается на числа, которые уже посчитаны, — см. заголовок
 * lib/problems.ts. Раздел поэтому работает без ключа к API, ничего не тратит из
 * тарифа и отвечает одинаково при каждом открытии.
 */
export async function getLibrary(
  rawInitData: string | undefined,
): Promise<LibrarySnapshot> {
  const { userId, timezone } = await requireUserContext(rawInitData);
  const analysis = await buildCoachAnalysis(userId, timezone);

  const { nutrition, sleep, metrics } = analysis;

  const problems = detectProblems({
    habitAdherence: metrics.habitAdherence,
    habitsActive: analysis.habits.length,
    nutritionAdherence: nutrition.adherence ?? 0,
    hasNutritionGoal: nutrition.hasGoal,
    proteinRatio:
      nutrition.hasGoal && nutrition.caloriesGoal > 0
        ? // Цель по белку не выведена в CoachNutritionFact, поэтому берётся
          // общепринятая опора: 1,6 г на кг веса — нижняя граница диапазона, из
          // которого считает и раздел питания.
          nutrition.averageProteinWeekG / Math.max(1, analysis.profile.weightKg * 1.6)
        : null,
    sleepDebtMin: sleep.debtWeekMin,
    bedTimeSpreadMin: sleep.bedTimeSpreadMin,
    hasSleepLogs: sleep.hasLogs,
    workoutsWeek: metrics.workoutsWeek,
    workoutAdherence: metrics.workoutAdherence,
    hasWorkouts: analysis.workouts.length > 0,
    goalsActive: metrics.goalsActive,
    goalsCompleted: metrics.goalsCompleted,
    tasksOverdue: metrics.tasksOverdue,
    daysWithNova: analysis.clock.daysWithNova,
    caloriesRatio:
      nutrition.hasGoal && nutrition.caloriesGoal > 0
        ? nutrition.averageCaloriesWeek / nutrition.caloriesGoal
        : null,
  });

  return {
    recommendations: recommendBooks(problems),
    books: LIBRARY_BOOKS,
  };
}
