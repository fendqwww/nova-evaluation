import type {
  LifeScoreHabits,
  LifeScoreInput,
  LifeScoreResult,
  LifeScoreTasks,
} from "@/features/life-score/types";

// Weights are the only thing likely to change as this gets smarter later —
// callers only ever see { score, breakdown }, never these constants.
const MAX_PROFILE = 15;
const MAX_WELLNESS = 25;
const MAX_GOALS = 20;
const MAX_HABITS = 20;
const MAX_TASKS = 20;

/** Finishing this many tasks in the window is full marks. */
const TASKS_FOR_FULL_MARKS = 7;
/** Each overdue task costs this share of the tasks block… */
const OVERDUE_PENALTY = 0.08;
/** …down to at most this much of it. */
const MAX_OVERDUE_PENALTY = 0.5;

/** The trailing window habits and tasks are judged over. */
export const SCORING_WINDOW_DAYS = 7;

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
 * Habits score on adherence, not on existing.
 *
 * Counting habits rewarded the wrong thing: a habit created once and never kept
 * scored exactly as well as one kept every day, so the number went up for
 * intent and never came down for abandonment. The ratio of ticks made to ticks
 * owed is the honest version, and it is why HabitLog exists at all.
 *
 * A user with no active habits scores zero rather than full marks — the ratio
 * would otherwise be vacuously perfect (0 owed, 0 done), which would hand out
 * points for having nothing to keep.
 */
function scoreHabits(habits: LifeScoreHabits): number {
  if (habits.activeCount === 0 || habits.expected === 0) return 0;
  const ratio = Math.min(1, habits.done / habits.expected);
  return Math.round(MAX_HABITS * ratio);
}

/**
 * Tasks score on throughput, with a penalty for rot.
 *
 * Completion within the window is the positive signal; open tasks that are
 * already past due are the negative one. Both are needed — a list nobody
 * finishes and a list nobody prunes are different failures, and a count of
 * created tasks could see neither.
 *
 * The penalty is capped at half the block so a bad backlog cannot zero out a
 * genuinely productive week, and applies to the earned score rather than the
 * maximum so it cannot push the total negative.
 */
function scoreTasks(tasks: LifeScoreTasks): number {
  if (tasks.open === 0 && tasks.completed === 0) return 0;

  const throughput = Math.min(1, tasks.completed / TASKS_FOR_FULL_MARKS);
  const penalty = Math.min(MAX_OVERDUE_PENALTY, tasks.overdue * OVERDUE_PENALTY);

  return Math.round(MAX_TASKS * Math.max(0, throughput - penalty));
}

/**
 * Profile completeness + a BMI-derived wellness signal + evidence of follow
 * through.
 *
 * The engagement half used to be "how many things did you create", which is a
 * proxy that stops tracking reality the moment the app can observe the real
 * thing. Habits and tasks now report what actually happened over the trailing
 * week; goals stay count-based because a goal is a months-long commitment and
 * having several in flight genuinely is the signal there.
 *
 * Deliberately swappable — this is the only place the formula lives, and the UI
 * never sees these internals. The breakdown keys are unchanged, so the Dashboard
 * card and its modal keep working untouched.
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
      label: "Привычки за неделю",
      score: scoreHabits(input.habits),
      maxScore: MAX_HABITS,
    },
    {
      key: "tasks",
      label: "Задачи за неделю",
      score: scoreTasks(input.tasks),
      maxScore: MAX_TASKS,
    },
  ];

  const score = Math.round(breakdown.reduce((sum, item) => sum + item.score, 0));

  return { score, breakdown };
}
