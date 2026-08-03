import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { formatDuration } from "@/features/sleep/lib/duration";
import type { CoachAnalysis, CoachBulletTone } from "@/features/coach/types";

/**
 * What changed, and what is worth saying out loud about it.
 *
 * The rest of the Coach answers questions. This module notices things nobody
 * asked about — that last night was an hour and twenty short of the user's own
 * norm, that the diary has been kept four days running, that nothing has been
 * trained since Tuesday — and it is what turns the screen from a chat box into
 * a coach who was already paying attention.
 *
 * Two consumers, one list. The daily brief leads with the strongest
 * observations, and every Gemini prompt carries them as a `<signals>` block:
 * a model handed forty raw numbers has to find the story itself and will
 * sometimes find the wrong one, while a model handed "спал на 1 ч 20 мин
 * меньше нормы" spends its budget on what to do about it. The numbers are
 * still there either way — an observation never replaces the data, it ranks
 * it.
 *
 * Pure and synchronous, like every other lib/ module here: same analysis in,
 * same observations out, no clock and no database of its own.
 *
 * Two rules hold everywhere below:
 *   1. Every observation is a fact with a number in it. "Ты стал меньше
 *      спать" is not an observation, "средний сон 6 ч 40 мин против 7 ч 25
 *      мин неделю назад" is.
 *   2. Nothing fires without the data to support it. A section the user has
 *      never touched produces silence, not a nudge to start using it — that
 *      is the empty state's job, not the Coach's.
 */

export type CoachObservationKind =
  | "score"
  | "sleep"
  | "nutrition"
  | "workouts"
  | "habits"
  | "tasks"
  | "goals"
  | "appearance";

export interface CoachObservation {
  id: string;
  kind: CoachObservationKind;
  tone: CoachBulletTone;
  /** One sentence, always carrying the number it is derived from. */
  text: string;
  /**
   * How much this deserves to be said first. Roughly: 90+ is something going
   * wrong right now, 60–80 is a real trend, 30–50 is worth a mention, below
   * that is colour. Ranking rather than filtering, so a quiet day still has
   * something honest to lead with.
   */
  weight: number;
}

/** Below this, a change is noise rather than a trend. */
const SLEEP_DELTA_MIN = 30;
/** A bedtime that swings by this much is irregular whatever the average says. */
const BEDTIME_SPREAD_MIN = 120;
/** Days without a finished session before it is worth naming. */
const WORKOUT_GAP_DAYS = 4;
/** Streak lengths worth stopping on. */
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100];

export function observe(analysis: CoachAnalysis): CoachObservation[] {
  return [
    ...scoreObservations(analysis),
    ...sleepObservations(analysis),
    ...workoutObservations(analysis),
    ...nutritionObservations(analysis),
    ...habitObservations(analysis),
    ...taskObservations(analysis),
    ...goalObservations(analysis),
    ...appearanceObservations(analysis),
  ].sort((a, b) => b.weight - a.weight);
}

/** The strongest `count` of them, for a card that only has room for a few. */
export function topObservations(
  analysis: CoachAnalysis,
  count: number,
): CoachObservation[] {
  return observe(analysis).slice(0, count);
}

// ---------------------------------------------------------------------------
// Per section
// ---------------------------------------------------------------------------

function scoreObservations(analysis: CoachAnalysis): CoachObservation[] {
  const previous = analysis.yesterday?.lifeScore.score;
  if (previous === undefined) return [];

  const delta = analysis.metrics.lifeScore.score - previous;
  if (Math.abs(delta) < 3) return [];

  return [
    {
      id: "score-delta",
      kind: "score",
      tone: delta > 0 ? "positive" : "warning",
      text:
        delta > 0
          ? `Индекс жизни вырос на ${delta} за сутки: ${previous} → ${analysis.metrics.lifeScore.score}.`
          : `Индекс жизни упал на ${Math.abs(delta)} за сутки: ${previous} → ${analysis.metrics.lifeScore.score}.`,
      weight: delta > 0 ? 55 : 75,
    },
  ];
}

function sleepObservations(analysis: CoachAnalysis): CoachObservation[] {
  const sleep = analysis.sleep;
  if (!sleep.hasLogs) return [];

  const out: CoachObservation[] = [];

  // Last night against the user's own norm — not against eight hours. A
  // person who sleeps seven is not failing at eight, and the only number that
  // makes "меньше обычного" true is their own average.
  if (sleep.lastNightMin !== null && sleep.average7dMin > 0) {
    const delta = sleep.lastNightMin - sleep.average7dMin;
    if (Math.abs(delta) >= 45) {
      out.push({
        id: "sleep-last-night",
        kind: "sleep",
        tone: delta < 0 ? "warning" : "positive",
        text:
          delta < 0
            ? `Прошлой ночью ${formatDuration(sleep.lastNightMin)} — на ${formatDuration(Math.abs(delta))} меньше твоей средней нормы ${formatDuration(sleep.average7dMin)}.`
            : `Прошлой ночью ${formatDuration(sleep.lastNightMin)} — на ${formatDuration(delta)} больше твоей средней ${formatDuration(sleep.average7dMin)}.`,
        weight: delta < 0 ? 95 : 60,
      });
    }
  }

  if (sleep.lastNightMin === null && sleep.streak === 0 && sleep.daysLoggedWeek > 0) {
    out.push({
      id: "sleep-missing",
      kind: "sleep",
      tone: "neutral",
      text: "Сегодняшняя ночь не записана, поэтому про сон сегодня выводов нет.",
      weight: 35,
    });
  }

  if (sleep.average7dMin > 0 && sleep.averagePrev7dMin > 0) {
    const delta = sleep.average7dMin - sleep.averagePrev7dMin;
    if (Math.abs(delta) >= SLEEP_DELTA_MIN) {
      out.push({
        id: "sleep-trend",
        kind: "sleep",
        tone: delta < 0 ? "warning" : "positive",
        text: `Средний сон за неделю ${formatDuration(sleep.average7dMin)} против ${formatDuration(sleep.averagePrev7dMin)} неделей раньше.`,
        weight: 70,
      });
    }
  }

  if (sleep.bedTimeSpreadMin !== null && sleep.bedTimeSpreadMin >= BEDTIME_SPREAD_MIN) {
    out.push({
      id: "sleep-spread",
      kind: "sleep",
      tone: "warning",
      text: `Время отхода ко сну за неделю разъезжается на ${formatDuration(sleep.bedTimeSpreadMin)} — режим нестабильный.`,
      weight: 65,
    });
  }

  if (sleep.debtWeekMin >= 240 && sleep.recentNights.length >= 3) {
    out.push({
      id: "sleep-debt",
      kind: "sleep",
      tone: sleep.debtWeekMin >= 600 ? "critical" : "warning",
      text: `За неделю недобрано ${formatDuration(sleep.debtWeekMin)} сна относительно цели в ${formatDuration(sleep.goalMin)}.`,
      weight: 68,
    });
  }

  if (sleep.streak >= 7) {
    out.push({
      id: "sleep-streak",
      kind: "sleep",
      tone: "positive",
      text: `Сон записан ${sleep.streak} ${pluralizeRu(sleep.streak, ["день", "дня", "дней"])} подряд.`,
      weight: 40,
    });
  }

  return out;
}

function workoutObservations(analysis: CoachAnalysis): CoachObservation[] {
  if (analysis.workouts.length === 0) return [];

  const out: CoachObservation[] = [];
  const { daysSinceLastWorkout, trends, metrics } = analysis;

  if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= WORKOUT_GAP_DAYS) {
    out.push({
      id: "workout-gap",
      kind: "workouts",
      tone: daysSinceLastWorkout >= 7 ? "critical" : "warning",
      text: `Последняя завершённая тренировка была ${daysSinceLastWorkout} ${pluralizeRu(daysSinceLastWorkout, ["день", "дня", "дней"])} назад.`,
      weight: 85,
    });
  }

  const delta = trends.workoutsDone.current - trends.workoutsDone.previous;
  if (Math.abs(delta) >= 2) {
    out.push({
      id: "workout-trend",
      kind: "workouts",
      tone: delta > 0 ? "positive" : "warning",
      text: `Тренировок за неделю ${trends.workoutsDone.current} против ${trends.workoutsDone.previous} неделей раньше.`,
      weight: 60,
    });
  }

  if (metrics.workoutsRemaining > 0) {
    out.push({
      id: "workout-due",
      kind: "workouts",
      tone: "neutral",
      text: `План на сегодня: ${metrics.workoutsRemaining} ${pluralizeRu(metrics.workoutsRemaining, ["тренировка", "тренировки", "тренировок"])} ещё не закрыта.`,
      weight: 72,
    });
  }

  const openSession = analysis.workouts.find((workout) => workout.isOpenToday);
  if (openSession) {
    out.push({
      id: "workout-open",
      kind: "workouts",
      tone: "warning",
      // Worth its high weight: an unfinished session counts nowhere — not in
      // the streak, not in the score — and the user almost certainly thinks
      // it does.
      text: `Тренировка «${openSession.title}» начата сегодня и не завершена — в статистику она пока не идёт.`,
      weight: 88,
    });
  }

  return out;
}

function nutritionObservations(analysis: CoachAnalysis): CoachObservation[] {
  const food = analysis.nutrition;
  const out: CoachObservation[] = [];

  if (food.loggingStreak >= 3) {
    out.push({
      id: "nutrition-streak",
      kind: "nutrition",
      tone: "positive",
      text: `Дневник питания заполняется ${food.loggingStreak} ${pluralizeRu(food.loggingStreak, ["день", "дня", "дней"])} подряд.`,
      weight: 50,
    });
  }

  if (food.hasGoal && !food.isLoggedToday && analysis.clock.localHour >= 14) {
    out.push({
      id: "nutrition-empty-today",
      kind: "nutrition",
      tone: "warning",
      text: `Сегодня в дневнике питания пока пусто, а на часах ${analysis.clock.localHour}:00.`,
      weight: 66,
    });
  }

  if (food.averageCaloriesWeek > 0 && food.averageCaloriesPrevWeek > 0) {
    const delta = food.averageCaloriesWeek - food.averageCaloriesPrevWeek;
    if (Math.abs(delta) >= food.averageCaloriesPrevWeek * 0.15) {
      out.push({
        id: "nutrition-calories-trend",
        kind: "nutrition",
        tone: "neutral",
        text: `Средние калории за неделю ${food.averageCaloriesWeek} против ${food.averageCaloriesPrevWeek} неделей раньше.`,
        weight: 58,
      });
    }
  }

  if (food.hasGoal && food.isLoggedToday && food.caloriesGoal > 0) {
    const left = food.caloriesGoal - food.caloriesToday;
    if (left <= -food.caloriesGoal * 0.15) {
      out.push({
        id: "nutrition-over",
        kind: "nutrition",
        tone: "warning",
        text: `Сегодня ${food.caloriesToday} ккал при цели ${food.caloriesGoal} — перебор на ${Math.abs(left)}.`,
        weight: 62,
      });
    }
  }

  if (food.waterGoalMl > 0 && food.waterTodayMl < food.waterGoalMl * 0.5 && analysis.clock.localHour >= 16) {
    out.push({
      id: "nutrition-water",
      kind: "nutrition",
      tone: "neutral",
      text: `Воды за день ${food.waterTodayMl} мл из ${food.waterGoalMl} мл.`,
      weight: 45,
    });
  }

  return out;
}

function habitObservations(analysis: CoachAnalysis): CoachObservation[] {
  if (analysis.habits.length === 0) return [];

  const out: CoachObservation[] = [];
  const { trends, metrics } = analysis;

  const best = [...analysis.habits].sort((a, b) => b.currentStreak - a.currentStreak)[0];
  if (best && best.streakUnit === "day" && STREAK_MILESTONES.includes(best.currentStreak)) {
    out.push({
      id: "habit-milestone",
      kind: "habits",
      tone: "positive",
      text: `«${best.title}» — серия ${best.currentStreak} ${pluralizeRu(best.currentStreak, ["день", "дня", "дней"])} подряд.`,
      weight: 64,
    });
  }

  const dropped = analysis.habits.filter(
    (habit) => habit.weekTarget > 0 && habit.weekDone === 0,
  );
  if (dropped.length > 0) {
    out.push({
      id: "habit-dropped",
      kind: "habits",
      tone: "critical",
      text: `На этой неделе ни разу не отмечены: ${dropped.slice(0, 3).map((habit) => `«${habit.title}»`).join(", ")}.`,
      weight: 82,
    });
  }

  const delta = trends.habitAdherencePercent.current - trends.habitAdherencePercent.previous;
  if (Math.abs(delta) >= 15) {
    out.push({
      id: "habit-trend",
      kind: "habits",
      tone: delta > 0 ? "positive" : "warning",
      text: `Дисциплина по привычкам ${trends.habitAdherencePercent.current}% против ${trends.habitAdherencePercent.previous}% неделей раньше.`,
      weight: 63,
    });
  }

  if (metrics.habitsRemaining > 0) {
    out.push({
      id: "habit-remaining",
      kind: "habits",
      tone: "neutral",
      text: `Сегодня осталось отметить ${metrics.habitsRemaining} из ${metrics.habitsDue}.`,
      weight: 55,
    });
  }

  return out;
}

function taskObservations(analysis: CoachAnalysis): CoachObservation[] {
  const out: CoachObservation[] = [];
  const { metrics, trends } = analysis;

  if (metrics.tasksOverdue > 0) {
    const worst = analysis.tasks
      .filter((task) => task.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)[0];

    out.push({
      id: "tasks-overdue",
      kind: "tasks",
      tone: metrics.tasksOverdue >= 3 ? "critical" : "warning",
      text: worst
        ? `Просрочено ${metrics.tasksOverdue}, дольше всех — «${worst.title}» на ${worst.daysOverdue} ${pluralizeRu(worst.daysOverdue, ["день", "дня", "дней"])}.`
        : `Просрочено задач: ${metrics.tasksOverdue}.`,
      weight: 90,
    });
  }

  const delta = trends.tasksCompleted.current - trends.tasksCompleted.previous;
  if (Math.abs(delta) >= 3) {
    out.push({
      id: "tasks-trend",
      kind: "tasks",
      tone: delta > 0 ? "positive" : "neutral",
      text: `Закрыто задач за неделю ${trends.tasksCompleted.current} против ${trends.tasksCompleted.previous} неделей раньше.`,
      weight: 52,
    });
  }

  return out;
}

function goalObservations(analysis: CoachAnalysis): CoachObservation[] {
  const out: CoachObservation[] = [];

  const urgent = analysis.goals
    .filter((goal) => !goal.isCompleted && goal.daysLeft !== null && goal.daysLeft <= 7)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];

  if (urgent && urgent.daysLeft !== null) {
    out.push({
      id: "goal-deadline",
      kind: "goals",
      tone: urgent.daysLeft < 0 ? "critical" : "warning",
      text:
        urgent.daysLeft < 0
          ? `Срок цели «${urgent.title}» прошёл ${Math.abs(urgent.daysLeft)} ${pluralizeRu(Math.abs(urgent.daysLeft), ["день", "дня", "дней"])} назад, готовность ${urgent.percent}%.`
          : `До срока цели «${urgent.title}» ${urgent.daysLeft} ${pluralizeRu(urgent.daysLeft, ["день", "дня", "дней"])}, готовность ${urgent.percent}%.`,
      weight: 78,
    });
  }

  const nearly = analysis.goals.find(
    (goal) => !goal.isCompleted && goal.percent >= 80 && goal.percent < 100,
  );
  if (nearly) {
    out.push({
      id: "goal-nearly",
      kind: "goals",
      tone: "positive",
      text: `Цель «${nearly.title}» готова на ${nearly.percent}% — осталось немного.`,
      weight: 48,
    });
  }

  return out;
}

function appearanceObservations(analysis: CoachAnalysis): CoachObservation[] {
  const care = analysis.appearance;
  if (care.activeCount === 0) return [];

  const out: CoachObservation[] = [];

  if (care.streak >= 7) {
    out.push({
      id: "care-streak",
      kind: "appearance",
      tone: "positive",
      text: `Уход выполняется без пропусков ${care.streak} ${pluralizeRu(care.streak, ["день", "дня", "дней"])} подряд.`,
      weight: 42,
    });
  }

  if (
    care.weakestArea !== null &&
    care.weakestAreaAdherence !== null &&
    care.weakestAreaAdherence < 0.5
  ) {
    out.push({
      id: "care-weakest",
      kind: "appearance",
      tone: "warning",
      text: `Слабее всего идёт зона «${care.weakestArea}»: ${Math.round(care.weakestAreaAdherence * 100)}% за месяц.`,
      weight: 46,
    });
  }

  return out;
}
