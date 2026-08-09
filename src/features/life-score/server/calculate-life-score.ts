import type {
  LifeScoreAppearance,
  LifeScoreHabits,
  LifeScoreInput,
  LifeScoreNutrition,
  LifeScoreResult,
  LifeScoreSleep,
  LifeScoreTasks,
  LifeScoreWorkouts,
} from "@/features/life-score/types";

// Weights are the only thing likely to change as this gets smarter later —
// callers only ever see { score, breakdown }, never these constants.
//
// Training took its 15 points out of profile (−5), wellness (−5) and goals (−5)
// rather than out of habits or tasks, and the split is deliberate. Profile and
// wellness are the two blocks that measure a *declaration* rather than a
// behaviour: filling in a form once and a BMI derived from that same form. A
// week of real sessions is stronger evidence about the same subject — the body —
// than the number the user typed during onboarding, so moving weight from those
// two towards observed training makes the index describe more of what actually
// happened. Goals gave up its five for the same reason it is still counted
// rather than measured: it is the softest signal left. Habits and tasks were
// left alone at 20 each; they already measure behaviour, and the AI Coach quotes
// both figures out loud.
//
// Nutrition's 5 points came out of profile (−2) and wellness (−3) for the same
// reason training's did: keeping a food diary for a week is stronger evidence
// about the body than the height/weight typed once at onboarding. It is
// deliberately the smallest block — logging a diary is a lighter signal than
// completing a training session, since a day can be logged in seconds without
// the diary being honest, and the block only rewards keeping it at all (see
// scoreNutrition), never hitting the calorie target on the nose.
//
// Appearance's 5 points came out of wellness (−3) and goals (−2), and the split
// follows the same logic training's did. Wellness is a BMI derived from numbers
// typed once at onboarding; a week of care that actually happened is stronger
// evidence about the body than a declaration about it. Goals gave up two for
// the reason it keeps giving them up: it is the softest signal left, still
// counted rather than measured. Habits, tasks, training and nutrition were left
// alone — they already measure behaviour, and the Coach quotes all four out
// loud.
//
// Appearance is worth the same as training's smallest sibling rather than more,
// because a care routine is a cheaper act than a session: five minutes at the
// sink is real, repeated, and worth counting, but it is not a workout.
//
// ── HEALTH-FIRST REWEIGHTING ────────────────────────────────────────────────
//
// Sleep now has a block, and the three health blocks are no longer the three
// smallest things on the board. The old split was written when this was a Life
// OS: tasks and habits held 40 of the 100 points, nutrition held 5, and sleep —
// the thing every other block depends on — held none at all, so a user could
// sleep four hours a night for a fortnight without the index moving a point.
//
// Where the 18 points for sleep came from, and why:
//   tasks      20 → 12  (−8)  A closed to-do is the weakest evidence about a
//                             body on this board. It stays counted because
//                             rot in a task list is real, but it can no longer
//                             outweigh a week of training.
//   habits     20 → 15  (−5)  Still the strongest behavioural signal outside
//                             training, and still worth more than any single
//                             health block on its own.
//   goals      13 → 10  (−3)  It keeps giving up points for the reason it
//                             always does: it is counted, not measured.
//   profile     8 →  6  (−2)  A form filled in once should not be worth a
//                             third of a week of real sleep.
//
// And where nutrition's extra 7 came from: wellness (−4), which is a BMI
// derived from numbers typed at onboarding, and goals (−3) again. Keeping a
// diary for a week is stronger evidence about the body than a declaration
// about it — the same argument that moved points to training originally, now
// applied to the block that argument skipped.
//
// Sleep is worth more than nutrition and less than habits on purpose. It is
// measured (a logged night is a real event, unlike a diary day that can be
// filled in seconds), it is upstream of everything else, and it is still one
// input among several rather than the whole picture.
const MAX_PROFILE = 6;
const MAX_WELLNESS = 10;
const MAX_GOALS = 10;
const MAX_HABITS = 15;
const MAX_TASKS = 12;
const MAX_WORKOUTS = 15;
const MAX_NUTRITION = 12;
const MAX_APPEARANCE = 5;
const MAX_SLEEP = 15;

/** Finishing this many tasks in the window is full marks. */
const TASKS_FOR_FULL_MARKS = 7;
/** Each overdue task costs this share of the tasks block… */
const OVERDUE_PENALTY = 0.08;
/** …down to at most this much of it. */
const MAX_OVERDUE_PENALTY = 0.5;

/** The trailing window habits and tasks are judged over. */
export const SCORING_WINDOW_DAYS = 7;

/**
 * The falloff scales with the block rather than being a fixed constant.
 *
 * It was 1.8 when wellness was worth 25 and 1.44 when it was worth 17, and it
 * is derived here for the same reason it was rewritten then: the coefficient
 * has to move with the block so the *shape* of the curve is unchanged and a
 * given body still scores the same share of whatever wellness is currently
 * worth. Leaving a literal behind on each reweighting would quietly make the
 * penalty harsher every time, which is not a decision any of them meant to
 * make.
 */
const WELLNESS_FALLOFF_PER_BMI_POINT = (MAX_WELLNESS / 25) * 1.8;

function scoreWellness(heightCm: number | null, weightKg: number | null): number {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const distanceFromIdeal = Math.abs(bmi - 22);
  return Math.max(
    0,
    Math.min(
      MAX_WELLNESS,
      Math.round(MAX_WELLNESS - distanceFromIdeal * WELLNESS_FALLOFF_PER_BMI_POINT),
    ),
  );
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
 * Training scores on adherence, exactly like habits.
 *
 * Counting programmes would reward the wrong thing in the same way counting
 * habits did: a plan written once and never followed would score as well as one
 * trained three times a week. The ratio of sessions completed to sessions owed
 * is the honest version, and it is why WorkoutSession carries completedAt.
 *
 * A user with no workouts scores zero rather than full marks — the ratio would
 * otherwise be vacuously perfect (0 owed, 0 done), handing out points for
 * having nothing to train.
 */
function scoreWorkouts(workouts: LifeScoreWorkouts): number {
  if (workouts.activeCount === 0 || workouts.expected === 0) return 0;
  const ratio = Math.min(1, workouts.done / workouts.expected);
  return Math.round(MAX_WORKOUTS * ratio);
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
 * Nutrition scores on whether the diary is kept, not on hitting the target.
 *
 * Unlike habits and workouts, there is no "owed vs done" count to compare —
 * a day either has an entry or it does not, and the target is a number to aim
 * at rather than a pass/fail gate (see the note on NutritionEntry). A user
 * with no goal set scores zero rather than full marks, the same
 * vacuous-ratio guard scoreHabits and scoreWorkouts apply.
 */
function scoreNutrition(nutrition: LifeScoreNutrition): number {
  if (!nutrition.hasGoal || nutrition.expected === 0) return 0;
  const ratio = Math.min(1, nutrition.daysLogged / nutrition.expected);
  return Math.round(MAX_NUTRITION * ratio);
}

/**
 * Appearance scores on adherence, exactly like habits and training.
 *
 * A care routine carries a schedule, so unlike nutrition there is a real "owed"
 * figure to divide by — and counting routines instead would reward the wrong
 * thing in the familiar way: an evening routine written once and never done
 * would score as well as one kept every night.
 *
 * A user with no routines scores zero rather than full marks, the same
 * vacuous-ratio guard the other adherence blocks apply.
 */
function scoreAppearance(appearance: LifeScoreAppearance): number {
  if (appearance.activeCount === 0 || appearance.expected === 0) return 0;
  const ratio = Math.min(1, appearance.done / appearance.expected);
  return Math.round(MAX_APPEARANCE * ratio);
}

/**
 * Sleep scores on two things at once: showing up, and actually sleeping.
 *
 * Splitting the block 40/60 is what stops either half being gameable. Logging
 * alone is worth 40% because a night that was never recorded cannot be judged
 * and the section is useless unlogged — but if logging were the whole block, a
 * user could take 40% for typing "23:00 / 03:00" seven times. The remaining 60%
 * measures the debt those nights ran up against the person's own norm, so the
 * only way to score it is to have slept.
 *
 * Debt is scaled by the norm rather than by a fixed constant: three hours short
 * of a 7h sleeper and three hours short of a 9h sleeper are the same failure,
 * and a fixed divisor would punish the long sleeper twice.
 *
 * Zero for a user with no logged nights, the same vacuous-ratio guard the other
 * blocks apply — nothing was measured, so nothing is owed and nothing is earned.
 */
function scoreSleep(sleep: LifeScoreSleep): number {
  if (sleep.expected === 0 || sleep.nightsLogged === 0) return 0;

  const logging = Math.min(1, sleep.nightsLogged / sleep.expected);

  // A full night's worth of debt across the window zeroes the rest half.
  const debtCeiling = sleep.normMin * sleep.nightsLogged * 0.35;
  const rest = debtCeiling === 0 ? 1 : Math.max(0, 1 - sleep.debtMin / debtCeiling);

  return Math.round(MAX_SLEEP * (logging * 0.4 + logging * rest * 0.6));
}

/**
 * Profile completeness + a BMI-derived wellness signal + evidence of follow
 * through.
 *
 * The engagement half used to be "how many things did you create", which is a
 * proxy that stops tracking reality the moment the app can observe the real
 * thing. Habits, tasks and workouts now report what actually happened over the
 * trailing week; goals stay count-based because a goal is a months-long
 * commitment and having several in flight genuinely is the signal there.
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
      // 5 per goal against a 13-point block: three goals in flight is still
      // full marks, the same point the old 7-against-20 curve reached, and the
      // block simply saturates a little sooner than it used to.
      label: "Цели",
      score: scoreCount(input.goalsCount, MAX_GOALS, 5),
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
    {
      key: "workouts",
      label: "Тренировки за неделю",
      score: scoreWorkouts(input.workouts),
      maxScore: MAX_WORKOUTS,
    },
    {
      key: "nutrition",
      label: "Питание за неделю",
      score: scoreNutrition(input.nutrition),
      maxScore: MAX_NUTRITION,
    },
    {
      key: "sleep",
      label: "Сон за неделю",
      score: scoreSleep(input.sleep),
      maxScore: MAX_SLEEP,
    },
    {
      key: "appearance",
      label: "Уход за неделю",
      score: scoreAppearance(input.appearance),
      maxScore: MAX_APPEARANCE,
    },
  ];

  const score = Math.round(breakdown.reduce((sum, item) => sum + item.score, 0));

  return { score, breakdown };
}
