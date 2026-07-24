import type { LifeScoreInput, LifeScoreResult } from "@/features/life-score/types";

// Weights are the only thing likely to change as this gets smarter later —
// callers only ever see { score, breakdown }, never these constants.
const MAX_PROFILE = 15;
const MAX_WELLNESS = 25;
const MAX_GOALS = 20;
const MAX_HABITS = 20;
const MAX_TASKS = 20;

function scoreWellness(heightCm: number | null, weightKg: number | null): number {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const distanceFromIdeal = Math.abs(bmi - 22);
  return Math.max(0, Math.min(MAX_WELLNESS, Math.round(MAX_WELLNESS - distanceFromIdeal * 1.8)));
}

function scoreCount(count: number, max: number, perItem: number): number {
  return Math.min(max, count * perItem);
}

/**
 * MVP heuristic: profile completeness + a BMI-derived wellness signal +
 * engagement (goals/habits/tasks created). Deliberately swappable — this is
 * the only place the formula lives, and the UI never sees these internals.
 */
export function calculateLifeScore(input: LifeScoreInput): LifeScoreResult {
  const breakdown = [
    {
      key: "profile",
      label: "Профиль заполнен",
      score: input.hasCompletedProfile ? MAX_PROFILE : 0,
      maxScore: MAX_PROFILE,
    },
    {
      key: "wellness",
      label: "Физическое состояние",
      score: scoreWellness(input.heightCm, input.weightKg),
      maxScore: MAX_WELLNESS,
    },
    {
      key: "goals",
      label: "Цели",
      score: scoreCount(input.goalsCount, MAX_GOALS, 7),
      maxScore: MAX_GOALS,
    },
    {
      key: "habits",
      label: "Привычки",
      score: scoreCount(input.habitsCount, MAX_HABITS, 7),
      maxScore: MAX_HABITS,
    },
    {
      key: "tasks",
      label: "Задачи",
      score: scoreCount(input.tasksCount, MAX_TASKS, 5),
      maxScore: MAX_TASKS,
    },
  ];

  const score = Math.round(breakdown.reduce((sum, item) => sum + item.score, 0));

  return { score, breakdown };
}
