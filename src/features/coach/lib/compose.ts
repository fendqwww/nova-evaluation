import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { formatStreak } from "@/features/habits/lib/stats";
import { formatStreak as formatWorkoutStreak } from "@/features/workouts/lib/stats";
import { formatVolume } from "@/features/workouts/lib/format";
import { caloriesWord, daysWord } from "@/features/nutrition/lib/format";
import { PRIMARY_GOAL_LABELS } from "@/features/onboarding/schemas";
import {
  focusWorkout,
  scoreVerdict,
  strongestHabit,
  urgentTasks,
  weakestHabits,
} from "@/features/coach/lib/analyze";
import type { CoachIntent } from "@/features/coach/lib/intents";
import type {
  CoachAction,
  CoachAnalysis,
  CoachAnswer,
  CoachBullet,
  CoachBulletTone,
  CoachGoalFact,
  CoachSignals,
} from "@/features/coach/types";

/**
 * The answer the Coach can always give.
 *
 * This is not a fallback in the sense of "something to show while the real
 * thing is unavailable" — it is the grounding layer. Every claim it makes is a
 * number that buildCoachAnalysis measured, which is why the same composer backs
 * the daily brief on the first screen, every quick action, and any typed
 * question when no model is configured. When Gemini *is* configured it writes
 * the prose over these same facts (see ai/coach.ts); it never gets to
 * decide what is true.
 *
 * Pure and synchronous: no clock, no database, no network. Give it the same
 * analysis twice and it says the same thing twice.
 */
export function composeAnswer(intent: CoachIntent, analysis: CoachAnalysis): CoachAnswer {
  switch (intent) {
    case "brief":
      return briefAnswer(analysis);
    case "score_drop":
      return scoreAnswer(analysis);
    case "improve_day":
      return improveAnswer(analysis);
    case "now":
      return nowAnswer(analysis);
    case "weak_habits":
      return habitsAnswer(analysis);
    case "workouts":
      return workoutsAnswer(analysis);
    case "nutrition":
      return nutritionAnswer(analysis);
    case "appearance":
      return appearanceAnswer(analysis);
    case "overdue":
      return overdueAnswer(analysis);
    case "evening":
      return eveningAnswer(analysis);
    case "goal_speed":
      return goalAnswer(analysis);
    case "mistakes":
      return mistakesAnswer(analysis);
    case "next_step":
      return nextStepAnswer(analysis);
    case "general":
      return briefAnswer(analysis);
  }
}

/** See the CoachSignals note in types.ts for why these are separate lists. */
export function composeSignals(analysis: CoachAnalysis): CoachSignals {
  return {
    recommendations: composeRecommendations(analysis),
    warnings: composeWarnings(analysis),
    motivation: composeMotivation(analysis),
  };
}

function composeRecommendations(analysis: CoachAnalysis): CoachBullet[] {
  const { metrics, potential } = analysis;
  const items: CoachBullet[] = [];

  if (metrics.tasksOverdue > 0) {
    items.push(
      bullet(
        "rec-overdue",
        "critical",
        `Разбери просроченное — ${metrics.tasksOverdue} ${tasksWord(metrics.tasksOverdue)}${
          potential.fromOverdueTasks > 0 ? `, это вернёт ${potential.fromOverdueTasks} ${pointsWord(potential.fromOverdueTasks)}` : ""
        }`,
      ),
    );
  }

  if (metrics.habitsRemaining > 0) {
    items.push(
      bullet(
        "rec-habits",
        "warning",
        `Осталось отметить ${metrics.habitsRemaining} ${habitsAccusative(metrics.habitsRemaining)} из ${metrics.habitsDue} на сегодня`,
      ),
    );
  }

  const openWorkout = analysis.workouts.find((workout) => workout.isOpenToday);
  if (openWorkout) {
    items.push(
      bullet(
        "rec-workout-open",
        "warning",
        `Тренировка «${openWorkout.title}» начата, но не завершена — закрой её, иначе день не засчитается`,
      ),
    );
  } else if (metrics.workoutsRemaining > 0) {
    const owed = analysis.workouts.find(
      (workout) => workout.isPlannedToday && !workout.isDoneToday,
    );
    items.push(
      bullet(
        "rec-workout",
        "warning",
        owed
          ? `Сегодня по плану «${owed.title}»${
              potential.fromWorkouts > 0
                ? ` — это ${potential.fromWorkouts} ${pointsWord(potential.fromWorkouts)} к индексу`
                : ""
            }`
          : `На сегодня запланировано тренировок: ${metrics.workoutsRemaining}`,
      ),
    );
  }

  if (analysis.workouts.length === 0) {
    items.push(
      bullet(
        "rec-first-workout",
        "neutral",
        "Заведи одну тренировку — сейчас блок тренировок в индексе пуст",
      ),
    );
  }

  if (analysis.nutrition.hasGoal && !analysis.nutrition.isLoggedToday) {
    items.push(
      bullet(
        "rec-nutrition",
        "warning",
        `Сегодня ещё нет ни одной записи в дневнике питания${
          potential.fromNutrition > 0
            ? ` — это ${potential.fromNutrition} ${pointsWord(potential.fromNutrition)} к индексу`
            : ""
        }`,
      ),
    );
  } else if (!analysis.nutrition.hasGoal) {
    items.push(
      bullet("rec-nutrition-goal", "neutral", "Задай дневную цель по калориям — сейчас блок питания в индексе пуст"),
    );
  }

  if (analysis.appearance.activeCount === 0) {
    items.push(
      bullet(
        "rec-first-routine",
        "neutral",
        "Заведи одну процедуру ухода — сейчас блок внешности в индексе пуст",
      ),
    );
  } else if (metrics.appearanceRemaining > 0) {
    items.push(
      bullet(
        "rec-appearance",
        "warning",
        analysis.appearance.nextTitle
          ? `Сегодня не закрыт уход: «${analysis.appearance.nextTitle}»${
              potential.fromAppearance > 0
                ? ` — это ${potential.fromAppearance} ${pointsWord(potential.fromAppearance)} к индексу`
                : ""
            }`
          : `На сегодня осталось процедур: ${metrics.appearanceRemaining}`,
      ),
    );
  }

  if (analysis.habits.length === 0) {
    items.push(
      bullet("rec-first-habit", "neutral", "Заведи одну привычку — сейчас блок привычек в индексе пуст"),
    );
  }

  const stepless = analysis.goals.filter((goal) => !goal.isCompleted && !goal.hasSteps);
  if (stepless.length > 0) {
    items.push(
      bullet("rec-steps", "neutral", `Разбей цель «${stepless[0].title}» на шаги — иначе прогресс не измерить`),
    );
  }

  const goal = focusGoal(analysis);
  if (goal && goal.hasSteps && goal.remainingSteps > 0) {
    items.push(
      bullet("rec-goal", "neutral", `Закрой один шаг цели «${goal.title}» — осталось ${goal.remainingSteps}`),
    );
  }

  if (analysis.goals.length === 0) {
    items.push(bullet("rec-first-goal", "neutral", "Поставь одну цель — без неё задачам некуда вести"));
  }

  if (metrics.tasksOpen > 12) {
    items.push(
      bullet("rec-backlog", "warning", `Проредить список: ${metrics.tasksOpen} открытых задач — это уже не план`),
    );
  }

  if (items.length === 0) {
    items.push(
      bullet("rec-plan", "neutral", "Всё срочное закрыто — запланируй одну задачу на завтра"),
    );
  }

  return items.slice(0, 3);
}

function composeWarnings(analysis: CoachAnalysis): CoachBullet[] {
  const { metrics, yesterday } = analysis;
  const items: CoachBullet[] = [];

  const lateGoal = analysis.goals.find(
    (goal) => !goal.isCompleted && goal.daysLeft !== null && goal.daysLeft < 0,
  );
  if (lateGoal) {
    items.push(bullet("warn-goal", "critical", `Цель «${lateGoal.title}» — ${deadlinePhrase(lateGoal)}`));
  }

  const overdueLong = analysis.tasks.filter((task) => task.daysOverdue >= 3);
  if (overdueLong.length > 0) {
    items.push(
      bullet(
        "warn-stale",
        "critical",
        `${overdueLong.length} ${tasksWord(overdueLong.length)} ${agree(overdueLong.length, ["просрочена", "просрочены", "просрочены"])} больше трёх дней`,
      ),
    );
  }

  const abandoned = analysis.habits.filter((habit) => habit.adherence < 0.4);
  if (abandoned.length > 0) {
    items.push(
      bullet(
        "warn-habits",
        "critical",
        `Дисциплина ниже 40% у ${abandoned.length} ${habitsGenitive(abandoned.length)}: ${abandoned
          .slice(0, 2)
          .map((habit) => habit.title)
          .join(", ")}`,
      ),
    );
  }

  if (metrics.tasksCompletedWeek === 0 && metrics.tasksOpen > 0) {
    items.push(bullet("warn-throughput", "warning", "За неделю не закрыто ни одной задачи"));
  }

  // Only workouts that actually owe something can be "abandoned" — a programme
  // with no plan owes nothing, so its adherence is null and it is skipped here
  // rather than reported as 0%.
  const slippingWorkouts = analysis.workouts.filter(
    (workout) => workout.adherence !== null && workout.adherence < 0.5,
  );
  if (slippingWorkouts.length > 0) {
    items.push(
      bullet(
        "warn-workouts",
        "critical",
        `План по тренировкам выполняется меньше чем наполовину: ${slippingWorkouts
          .slice(0, 2)
          .map((workout) => `«${workout.title}» ${Math.round((workout.adherence ?? 0) * 100)}%`)
          .join(", ")}`,
      ),
    );
  }

  if (analysis.workouts.length > 0 && metrics.workoutsWeek === 0) {
    items.push(
      bullet("warn-no-training", "warning", "За неделю не было ни одной тренировки"),
    );
  }

  if (analysis.nutrition.hasGoal && (analysis.nutrition.adherence ?? 1) < 0.5) {
    items.push(
      bullet(
        "warn-nutrition",
        "warning",
        `Дневник питания ведётся меньше чем в половине дней недели: ${metrics.nutritionDaysWeek} из 7`,
      ),
    );
  }

  if (analysis.appearance.activeCount > 0 && (analysis.appearance.adherence ?? 1) < 0.5) {
    items.push(
      bullet(
        "warn-appearance",
        "warning",
        analysis.appearance.weakestArea
          ? `Уход проседает — хуже всего идёт зона «${analysis.appearance.weakestArea}»`
          : "Процедуры ухода выполняются меньше чем наполовину",
      ),
    );
  }

  if (yesterday && metrics.lifeScore.score - yesterday.lifeScore.score <= -5) {
    const drop = yesterday.lifeScore.score - metrics.lifeScore.score;
    items.push(bullet("warn-drop", "warning", `Индекс упал на ${drop} ${pointsWord(drop)} за сутки`));
  }

  const dueToday = analysis.tasks.filter((task) => task.isDueToday);
  if (dueToday.length > 0 && analysis.profile.localHour >= 20) {
    items.push(
      bullet("warn-evening", "warning", `Вечер, а на сегодня ещё ${dueToday.length} ${tasksWord(dueToday.length)}`),
    );
  }

  return items.slice(0, 4);
}

function composeMotivation(analysis: CoachAnalysis): string {
  const { metrics, profile } = analysis;
  const best = strongestHabit(analysis.habits);

  if (best && best.currentStreak >= 3) {
    return `«${best.title}» держится ${formatStreak(best.currentStreak, best.streakUnit)} подряд. Такую серию проще продлить, чем начать заново — сегодняшняя отметка стоит дешевле, чем завтрашний рестарт.`;
  }

  if (metrics.workoutVolumeWeek > 0) {
    return `За неделю ты поднял ${formatVolume(metrics.workoutVolumeWeek)} суммарного объёма за ${metrics.workoutsWeek} ${pluralizeRu(metrics.workoutsWeek, ["тренировку", "тренировки", "тренировок"])}. Это не ощущение прогресса, а измеренный факт — и он растёт только повторением.`;
  }

  if (metrics.tasksCompletedToday > 0) {
    return `Сегодня уже ${agree(metrics.tasksCompletedToday, ["закрыта", "закрыто", "закрыто"])} ${metrics.tasksCompletedToday} ${tasksWord(metrics.tasksCompletedToday)}. День уже не нулевой — дальше только добавляешь.`;
  }

  if (metrics.tasksCompletedWeek >= 5) {
    return `За неделю закрыто ${metrics.tasksCompletedWeek} ${tasksWord(metrics.tasksCompletedWeek)} — это устойчивый темп, а не всплеск.`;
  }

  if (metrics.habitAdherence >= 0.7) {
    return `Дисциплина по привычкам ${Math.round(metrics.habitAdherence * 100)}% за неделю. Это уже система, её достаточно просто не ломать.`;
  }

  const completedGoals = metrics.goalsCompleted;
  if (completedGoals > 0) {
    return `${completedGoals} ${pluralizeRu(completedGoals, ["цель", "цели", "целей"])} уже закрыто. Ты умеешь доводить до конца — вопрос только в том, какую взять следующей.`;
  }

  return `${profile.firstName}, индекс считается по последним семи дням, а не по всей истории. Что бы ни было раньше, одна отметка сегодня уже двигает его вверх.`;
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function bullet(id: string, tone: CoachBulletTone, text: string): CoachBullet {
  return { id, tone, text };
}

const OPEN_TASKS: CoachAction = { id: "open-tasks", label: "Открыть задачи", target: "tasks" };
const OPEN_HABITS: CoachAction = { id: "open-habits", label: "Открыть привычки", target: "habits" };
const OPEN_GOALS: CoachAction = { id: "open-goals", label: "Открыть цели", target: "goals" };
const OPEN_WORKOUTS: CoachAction = {
  id: "open-workouts",
  label: "Открыть тренировки",
  target: "workouts",
};
const OPEN_NUTRITION: CoachAction = {
  id: "open-nutrition",
  label: "Открыть питание",
  target: "nutrition",
};

const OPEN_APPEARANCE: CoachAction = {
  id: "open-appearance",
  label: "Открыть внешность",
  target: "appearance",
};

function tasksWord(count: number): string {
  return pluralizeRu(count, ["задача", "задачи", "задач"]);
}

function routinesWord(count: number): string {
  return pluralizeRu(count, ["процедура", "процедуры", "процедур"]);
}

function workoutsWord(count: number): string {
  return pluralizeRu(count, ["тренировка", "тренировки", "тренировок"]);
}

function habitsWord(count: number): string {
  return pluralizeRu(count, ["привычка", "привычки", "привычек"]);
}

/** After a preposition that takes the genitive: "у 1 привычки", "у 2 привычек". */
function habitsGenitive(count: number): string {
  return pluralizeRu(count, ["привычки", "привычек", "привычек"]);
}

/** As the object of a verb: "выполнить 1 привычку", "выполнить 2 привычки". */
function habitsAccusative(count: number): string {
  return pluralizeRu(count, ["привычку", "привычки", "привычек"]);
}

function pointsWord(count: number): string {
  return pluralizeRu(count, ["балл", "балла", "баллов"]);
}

/**
 * Russian agrees the predicate with the count too, not just the noun.
 *
 * "1 задача просрочены" is exactly as wrong as "1 задачи", and it is the
 * failure mode a count-plus-noun helper alone does not catch — so any sentence
 * where the number drives a verb or a participle runs it through here as well.
 */
function agree(count: number, forms: [string, string, string]): string {
  return pluralizeRu(count, forms);
}

/** The gain sentence the brief promises — omitted entirely when it is zero. */
function potentialLine(analysis: CoachAnalysis): string | null {
  const gain = analysis.potential.total;
  if (gain <= 0) return null;
  return `Если закроешь всё, что осталось на сегодня, индекс вырастет на ${gain} ${pointsWord(gain)}.`;
}

/**
 * The one goal worth naming: nearest real deadline, else the one furthest
 * along. A user with six goals does not need a list, they need the next one.
 */
function focusGoal(analysis: CoachAnalysis): CoachGoalFact | null {
  const active = analysis.goals.filter((goal) => !goal.isCompleted);
  if (active.length === 0) return null;

  const dated = active
    .filter((goal) => goal.daysLeft !== null)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  if (dated.length > 0) return dated[0];

  return [...active].sort((a, b) => b.percent - a.percent)[0];
}

function deadlinePhrase(goal: CoachGoalFact): string {
  if (goal.daysLeft === null) return "без срока";
  if (goal.daysLeft < 0) {
    const late = Math.abs(goal.daysLeft);
    return `просрочена на ${late} ${pluralizeRu(late, ["день", "дня", "дней"])}`;
  }
  if (goal.daysLeft === 0) return "сегодня последний день";
  if (goal.daysLeft === 1) return "остался 1 день";
  return `осталось ${goal.daysLeft} ${pluralizeRu(goal.daysLeft, ["день", "дня", "дней"])}`;
}

/**
 * The answer for an account with nothing in it yet.
 *
 * Kept separate rather than woven into every branch: an empty account makes
 * almost every metric vacuously zero, and a coach that reports "0 просрочено,
 * 0% привычек, индекс 15" as though it were analysis is worse than one that
 * says plainly there is nothing to analyse yet.
 */
function emptyAnswer(analysis: CoachAnalysis): CoachAnswer {
  const focus = PRIMARY_GOAL_LABELS[analysis.profile.primaryGoal].toLocaleLowerCase("ru");

  return {
    headline: "Пока нечего анализировать",
    body: `${analysis.profile.firstName}, я разбираю твой день по целям, привычкам и задачам — сейчас их нет ни одной. Ты выбрал фокус «${focus}»: добавь одну вещь из этой области, и со следующего дня я начну считать динамику.`,
    bullets: [
      bullet("empty-score", "neutral", `Индекс сейчас ${analysis.metrics.lifeScore.score} из 100 — это профиль и физическая форма, без активности`),
      bullet("empty-bmi", "neutral", `ИМТ ${analysis.profile.bmi} — ${analysis.profile.bmiLabel}`),
    ],
    actions: [
      { id: "first-goal", label: "Поставить цель", target: "goals" },
      { id: "first-habit", label: "Завести привычку", target: "habits" },
      { id: "first-workout", label: "Создать тренировку", target: "workouts" },
    ],
  };
}

function isEmptyAccount(analysis: CoachAnalysis): boolean {
  return (
    analysis.goals.length === 0 &&
    analysis.habits.length === 0 &&
    analysis.tasks.length === 0 &&
    analysis.workouts.length === 0 &&
    analysis.metrics.tasksCompletedWeek === 0
  );
}

// ---------------------------------------------------------------------------
// Intents
// ---------------------------------------------------------------------------

function briefAnswer(analysis: CoachAnalysis): CoachAnswer {
  if (isEmptyAccount(analysis)) return emptyAnswer(analysis);

  const { metrics, potential } = analysis;
  const bullets: CoachBullet[] = [];

  if (metrics.habitsRemaining > 0) {
    bullets.push(
      bullet(
        "habits-left",
        "warning",
        `Осталось выполнить ${metrics.habitsRemaining} ${habitsAccusative(metrics.habitsRemaining)} из ${metrics.habitsDue}`,
      ),
    );
  } else if (metrics.habitsDue > 0) {
    bullets.push(
      bullet("habits-clear", "positive", `Все привычки на сегодня закрыты — ${metrics.habitsDue} из ${metrics.habitsDue}`),
    );
  }

  if (metrics.tasksOverdue > 0) {
    bullets.push(
      bullet(
        "tasks-overdue",
        "critical",
        `${agree(metrics.tasksOverdue, ["Просрочена", "Просрочено", "Просрочено"])} ${metrics.tasksOverdue} ${tasksWord(metrics.tasksOverdue)}${
          potential.fromOverdueTasks > 0
            ? ` — закрытие вернёт ${potential.fromOverdueTasks} ${pointsWord(potential.fromOverdueTasks)}`
            : ""
        }`,
      ),
    );
  }

  const openWorkout = analysis.workouts.find((workout) => workout.isOpenToday);
  if (openWorkout) {
    bullets.push(
      bullet("workout-open", "warning", `«${openWorkout.title}» начата и не завершена`),
    );
  } else if (metrics.workoutsRemaining > 0) {
    const owed = analysis.workouts.find(
      (workout) => workout.isPlannedToday && !workout.isDoneToday,
    );
    bullets.push(
      bullet(
        "workout-due",
        "warning",
        owed
          ? `Тренировка по плану: «${owed.title}»`
          : `На сегодня ${metrics.workoutsRemaining} ${workoutsWord(metrics.workoutsRemaining)}`,
      ),
    );
  } else if (metrics.workoutsDoneToday > 0) {
    bullets.push(
      bullet(
        "workout-done",
        "positive",
        `Тренировка на сегодня выполнена${
          metrics.workoutVolumeWeek > 0
            ? ` — за неделю ${formatVolume(metrics.workoutVolumeWeek)}`
            : ""
        }`,
      ),
    );
  }

  if (metrics.tasksDueToday > 0) {
    bullets.push(
      bullet(
        "tasks-today",
        "neutral",
        `На сегодня ${agree(metrics.tasksDueToday, ["запланирована", "запланировано", "запланировано"])} ${metrics.tasksDueToday} ${tasksWord(metrics.tasksDueToday)}`,
      ),
    );
  }

  if (metrics.tasksCompletedToday > 0) {
    bullets.push(
      bullet(
        "tasks-done",
        "positive",
        `Сегодня уже ${agree(metrics.tasksCompletedToday, ["закрыта", "закрыто", "закрыто"])} ${metrics.tasksCompletedToday} ${tasksWord(metrics.tasksCompletedToday)}`,
      ),
    );
  }

  const goal = focusGoal(analysis);
  if (goal) {
    const tone: CoachBulletTone =
      goal.daysLeft !== null && goal.daysLeft < 0
        ? "critical"
        : goal.daysLeft !== null && goal.daysLeft <= 3
          ? "warning"
          : "neutral";
    bullets.push(
      bullet(
        "goal",
        tone,
        `Цель «${goal.title}» — ${goal.percent}%, ${deadlinePhrase(goal)}`,
      ),
    );
  }

  const best = strongestHabit(analysis.habits);
  if (best && best.currentStreak >= 3) {
    bullets.push(
      bullet("streak", "positive", `«${best.title}» — серия ${formatStreak(best.currentStreak, best.streakUnit)}`),
    );
  }

  const headline =
    metrics.tasksOverdue > 0
      ? "День требует разгрузки"
      : metrics.workoutsRemaining > 0
        ? "Сегодня тренировочный день"
        : metrics.habitsRemaining > 0
          ? "День ещё можно закрыть в плюс"
          : goal && goal.daysLeft !== null && goal.daysLeft <= 3
            ? "Отличный день, чтобы закрыть главную цель"
            : "Ты идёшь ровно";

  const body = [
    `Индекс ${metrics.lifeScore.score} из 100 — ${scoreVerdict(metrics.lifeScore.score)}.`,
    potentialLine(analysis),
  ]
    .filter(Boolean)
    .join(" ");

  return { headline, body, bullets: bullets.slice(0, 5), actions: briefActions(analysis) };
}

function briefActions(analysis: CoachAnalysis): CoachAction[] {
  const actions: CoachAction[] = [];
  if (analysis.metrics.tasksOverdue > 0) {
    actions.push({ id: "fix-overdue", label: "Разобрать просроченное", target: "tasks" });
  }
  if (analysis.metrics.workoutsRemaining > 0) {
    actions.push({
      id: "do-workout",
      label: analysis.workouts.some((workout) => workout.isOpenToday)
        ? "Завершить тренировку"
        : "Начать тренировку",
      target: "workouts",
    });
  }
  if (analysis.metrics.habitsRemaining > 0) {
    actions.push({ id: "close-habits", label: "Отметить привычки", target: "habits" });
  }
  if (actions.length === 0) {
    const goal = focusGoal(analysis);
    if (goal) actions.push({ id: "push-goal", label: "Продвинуть цель", target: "goals" });
    else actions.push(OPEN_TASKS);
  }
  return actions;
}

function scoreAnswer(analysis: CoachAnalysis): CoachAnswer {
  const { metrics, yesterday } = analysis;
  const breakdown = metrics.lifeScore.breakdown;

  const bullets = breakdown.map((item) =>
    bullet(
      `block-${item.key}`,
      item.score >= item.maxScore * 0.75
        ? "positive"
        : item.score >= item.maxScore * 0.4
          ? "neutral"
          : "warning",
      `${item.label}: ${item.score} из ${item.maxScore}`,
    ),
  );

  const weakest = [...breakdown].sort(
    (a, b) => a.score / a.maxScore - b.score / b.maxScore,
  )[0];

  if (!yesterday) {
    return {
      headline: `Индекс ${metrics.lifeScore.score} из 100`,
      body: `Сравнивать пока не с чем — это твой первый день. Слабее всего сейчас блок «${weakest.label}»: ${weakest.score} из ${weakest.maxScore}.`,
      bullets,
      actions: [OPEN_TASKS, OPEN_HABITS],
    };
  }

  const delta = metrics.lifeScore.score - yesterday.lifeScore.score;

  // The reasons are read off the blocks that actually moved, not guessed from
  // the sign of the total — two blocks can move in opposite directions.
  const reasons: string[] = [];
  for (const item of breakdown) {
    const before = yesterday.lifeScore.breakdown.find((prev) => prev.key === item.key);
    if (!before || before.score === item.score) continue;
    const change = item.score - before.score;
    reasons.push(`${item.label}: ${change > 0 ? "+" : ""}${change}`);
  }

  const headline =
    delta < 0
      ? `Индекс упал на ${Math.abs(delta)} ${pointsWord(Math.abs(delta))}`
      : delta > 0
        ? `Индекс вырос на ${delta} ${pointsWord(delta)}`
        : "Индекс не изменился";

  const body =
    reasons.length > 0
      ? `Со вчера изменилось: ${reasons.join(", ")}. Слабее всего блок «${weakest.label}» — ${weakest.score} из ${weakest.maxScore}.`
      : `Ни один блок не сдвинулся со вчера. Слабее всего «${weakest.label}» — ${weakest.score} из ${weakest.maxScore}, туда и стоит вложиться.`;

  return {
    headline,
    body,
    bullets,
    actions: weakest.key === "habits" ? [OPEN_HABITS] : weakest.key === "goals" ? [OPEN_GOALS] : [OPEN_TASKS],
  };
}

function improveAnswer(analysis: CoachAnalysis): CoachAnswer {
  if (isEmptyAccount(analysis)) return emptyAnswer(analysis);

  const { potential, metrics } = analysis;
  const bullets: CoachBullet[] = [];

  if (potential.fromOverdueTasks > 0) {
    bullets.push(
      bullet("gain-overdue", "critical", `Закрыть просроченное: +${potential.fromOverdueTasks} ${pointsWord(potential.fromOverdueTasks)}`),
    );
  }
  if (potential.fromWorkouts > 0) {
    bullets.push(
      bullet(
        "gain-workouts",
        "warning",
        `Закрыть тренировку по плану: +${potential.fromWorkouts} ${pointsWord(potential.fromWorkouts)}`,
      ),
    );
  }
  if (potential.fromHabits > 0) {
    bullets.push(
      bullet("gain-habits", "warning", `Отметить оставшиеся привычки: +${potential.fromHabits} ${pointsWord(potential.fromHabits)}`),
    );
  }
  if (potential.fromOneTask > 0) {
    bullets.push(
      bullet("gain-task", "neutral", `Закрыть ещё одну задачу: +${potential.fromOneTask} ${pointsWord(potential.fromOneTask)}`),
    );
  }

  if (bullets.length === 0) {
    return {
      headline: "Сегодня добавить уже нечего",
      body: `Всё, что можно было закрыть сегодня, закрыто: индекс ${metrics.lifeScore.score} из 100. Дальше растёт только за счёт следующих дней — недельные блоки считаются по семи дням подряд.`,
      bullets: [
        bullet("steady", "positive", `Дисциплина по привычкам за неделю — ${Math.round(metrics.habitAdherence * 100)}%`),
      ],
      actions: [OPEN_GOALS],
    };
  }

  return {
    headline: `Сегодня можно поднять индекс на ${potential.total} ${pointsWord(potential.total)}`,
    body: `Порядок важен: сначала то, что уже штрафует счёт, потом то, что его добавляет.`,
    bullets,
    actions: briefActions(analysis),
  };
}

function nowAnswer(analysis: CoachAnalysis): CoachAnswer {
  if (isEmptyAccount(analysis)) return emptyAnswer(analysis);

  const urgent = urgentTasks(analysis.tasks, 3);
  const owed = analysis.habits.filter((habit) => habit.isDueToday && !habit.isDoneToday);

  // An unfinished workout outranks everything: it is already started, the
  // fastest thing on the list to close, and the only item that goes stale by
  // the end of the day whatever else happens.
  const openWorkout = analysis.workouts.find((workout) => workout.isOpenToday);
  if (openWorkout) {
    return {
      headline: `Сейчас: закончить «${openWorkout.title}»`,
      body: `Тренировка начата сегодня и не завершена. Пока она открыта, день по тренировкам не засчитан${
        analysis.potential.fromWorkouts > 0
          ? `, а это ${analysis.potential.fromWorkouts} ${pointsWord(analysis.potential.fromWorkouts)} индекса`
          : ""
      }.`,
      bullets: [
        bullet(
          `open-${openWorkout.id}`,
          "warning",
          `«${openWorkout.title}» — ${openWorkout.category.toLocaleLowerCase("ru")}, ${openWorkout.plan.toLocaleLowerCase("ru")}`,
        ),
      ],
      actions: [OPEN_WORKOUTS],
    };
  }

  if (urgent.length > 0 && urgent[0].daysOverdue > 0) {
    const task = urgent[0];
    return {
      headline: `Сейчас: «${task.title}»`,
      body: `Она просрочена на ${task.daysOverdue} ${pluralizeRu(task.daysOverdue, ["день", "дня", "дней"])} и тянет счёт вниз сильнее всего остального. Закрой её первой, остальное подождёт.`,
      bullets: urgent.map((item, index) =>
        bullet(
          `urgent-${item.id}`,
          index === 0 ? "critical" : "warning",
          item.daysOverdue > 0
            ? `«${item.title}» — просрочена на ${item.daysOverdue} ${pluralizeRu(item.daysOverdue, ["день", "дня", "дней"])}`
            : `«${item.title}» — на сегодня`,
        ),
      ),
      actions: [OPEN_TASKS],
    };
  }

  const plannedWorkout = analysis.workouts.find(
    (workout) => workout.isPlannedToday && !workout.isDoneToday,
  );
  if (plannedWorkout) {
    return {
      headline: `Сейчас: «${plannedWorkout.title}»`,
      body: `Сегодня тренировочный день по плану «${plannedWorkout.plan.toLocaleLowerCase("ru")}». ${
        plannedWorkout.currentStreak > 0
          ? `На кону серия в ${formatWorkoutStreak(plannedWorkout.currentStreak, plannedWorkout.streakUnit)}.`
          : "С неё же начнётся новая серия."
      }`,
      bullets: analysis.workouts
        .filter((workout) => workout.isPlannedToday && !workout.isDoneToday)
        .slice(0, 3)
        .map((workout) =>
          bullet(
            `plan-${workout.id}`,
            "warning",
            `«${workout.title}» — ${workout.category.toLocaleLowerCase("ru")}, на неделе ${workout.weekDone} из ${workout.weekTarget}`,
          ),
        ),
      actions: [OPEN_WORKOUTS],
    };
  }

  if (owed.length > 0) {
    const habit = owed[0];
    return {
      headline: `Сейчас: «${habit.title}»`,
      body: `Это самая быстрая победа из доступных — ${habit.schedule.toLocaleLowerCase("ru")}, и сегодня она ещё не отмечена. ${
        habit.currentStreak > 0
          ? `На кону серия в ${formatStreak(habit.currentStreak, habit.streakUnit)}.`
          : "С неё же начнётся новая серия."
      }`,
      bullets: owed
        .slice(0, 4)
        .map((item) =>
          bullet(`owed-${item.id}`, "warning", `«${item.title}» — ${item.schedule.toLocaleLowerCase("ru")}`),
        ),
      actions: [OPEN_HABITS],
    };
  }

  if (urgent.length > 0) {
    const task = urgent[0];
    return {
      headline: `Сейчас: «${task.title}»`,
      body: task.isDueToday
        ? "Она стоит на сегодня — закрой её, пока день не кончился."
        : "Просроченного и запланированного на сегодня нет, так что бери следующую по важности.",
      bullets: urgent.map((item) =>
        bullet(`next-${item.id}`, item.isDueToday ? "warning" : "neutral", `«${item.title}»`),
      ),
      actions: [OPEN_TASKS],
    };
  }

  const goal = focusGoal(analysis);
  return {
    headline: "Срочного нет — двигай цель",
    body: goal
      ? `Всё на сегодня закрыто. Самое ценное сейчас — один шаг к цели «${goal.title}» (${goal.percent}%, ${deadlinePhrase(goal)}).`
      : "Всё на сегодня закрыто. Самое ценное сейчас — поставить цель, чтобы у следующих дней было направление.",
    bullets: [],
    actions: [goal ? { id: "goal-step", label: "Открыть цель", target: "goals" } : OPEN_GOALS],
  };
}

function habitsAnswer(analysis: CoachAnalysis): CoachAnswer {
  if (analysis.habits.length === 0) {
    return {
      headline: "Привычек пока нет",
      body: "Блок «Привычки за неделю» даёт до 20 баллов индекса и сейчас пуст. Одна привычка, которую реально повторить, поднимет его быстрее любой другой активности.",
      bullets: [],
      actions: [{ id: "add-habit", label: "Завести привычку", target: "habits" }],
    };
  }

  const weak = weakestHabits(analysis.habits, 3);
  const worst = weak[0];

  return {
    headline: `Слабее всего — «${worst.title}»`,
    body: `Дисциплина ${Math.round(worst.adherence * 100)}% за месяц при графике «${worst.schedule.toLocaleLowerCase("ru")}». На этой неделе ${worst.weekDone} из ${worst.weekTarget}. Начни с неё: одна отметка сегодня меняет и серию, и недельный блок индекса.`,
    bullets: weak.map((habit) =>
      bullet(
        `weak-${habit.id}`,
        habit.adherence < 0.4 ? "critical" : habit.adherence < 0.7 ? "warning" : "positive",
        `«${habit.title}» — ${Math.round(habit.adherence * 100)}% за месяц, серия ${formatStreak(habit.currentStreak, habit.streakUnit)}`,
      ),
    ),
    actions: [OPEN_HABITS],
  };
}

/**
 * How training is actually going.
 *
 * Leads with what is owed today when something is, because that is the only
 * part of the answer the user can still act on; otherwise it reports the week
 * against the plan. Volume is quoted rather than "молодец" — tonnage is the one
 * number that separates a real training week from a logged one.
 */
function workoutsAnswer(analysis: CoachAnalysis): CoachAnswer {
  const { metrics } = analysis;

  if (analysis.workouts.length === 0) {
    return {
      headline: "Тренировок пока нет",
      body: "Блок «Тренировки за неделю» даёт до 15 баллов индекса и сейчас пуст. Одна программа, которую реально повторять, поднимет его быстрее, чем что-либо ещё в этом разделе.",
      bullets: [],
      actions: [{ id: "add-workout", label: "Создать тренировку", target: "workouts" }],
    };
  }

  const bullets: CoachBullet[] = analysis.workouts.slice(0, 4).map((workout) =>
    bullet(
      `w-${workout.id}`,
      workout.isOpenToday
        ? "warning"
        : workout.adherence === null
          ? "neutral"
          : workout.adherence < 0.5
            ? "critical"
            : workout.adherence < 0.8
              ? "warning"
              : "positive",
      `«${workout.title}» — ${
        workout.adherence === null
          ? `без плана, на неделе ${workout.weekDone} из ${workout.weekTarget}`
          : `${Math.round(workout.adherence * 100)}% плана за месяц, серия ${formatWorkoutStreak(workout.currentStreak, workout.streakUnit)}`
      }`,
    ),
  );

  const openWorkout = analysis.workouts.find((workout) => workout.isOpenToday);
  if (openWorkout) {
    return {
      headline: `«${openWorkout.title}» не завершена`,
      body: `Тренировка начата сегодня, но не закрыта — до этого момента она не идёт ни в статистику, ни в индекс. За неделю пока ${metrics.workoutsWeek} ${workoutsWord(metrics.workoutsWeek)}.`,
      bullets,
      actions: [OPEN_WORKOUTS],
    };
  }

  if (metrics.workoutsRemaining > 0) {
    const owed = focusWorkout(analysis.workouts);
    return {
      headline: `Сегодня по плану — ${metrics.workoutsRemaining} ${workoutsWord(metrics.workoutsRemaining)}`,
      body: owed
        ? `Начни с «${owed.title}»: на этой неделе ${owed.weekDone} из ${owed.weekTarget}${
            analysis.potential.fromWorkouts > 0
              ? `, и это ${analysis.potential.fromWorkouts} ${pointsWord(analysis.potential.fromWorkouts)} к индексу сегодня`
              : ""
          }.`
        : `За неделю закрыто ${metrics.workoutsWeek} ${workoutsWord(metrics.workoutsWeek)}.`,
      bullets,
      actions: [OPEN_WORKOUTS],
    };
  }

  if (metrics.workoutsWeek === 0) {
    return {
      headline: "За неделю ни одной тренировки",
      body: `Программы есть, но за последние семь дней ни одна не выполнена — блок тренировок в индексе сейчас нулевой. Одна сессия сегодня уже сдвинет его.`,
      bullets,
      actions: [OPEN_WORKOUTS],
    };
  }

  const weakest = focusWorkout(analysis.workouts);

  return {
    headline: `За неделю ${metrics.workoutsWeek} ${workoutsWord(metrics.workoutsWeek)}`,
    body: [
      metrics.workoutVolumeWeek > 0
        ? `Суммарный объём — ${formatVolume(metrics.workoutVolumeWeek)}.`
        : null,
      `Выполнение плана — ${Math.round(metrics.workoutAdherence * 100)}%.`,
      weakest && weakest.adherence !== null && weakest.adherence < 0.8
        ? `Слабее всего идёт «${weakest.title}» — ${Math.round(weakest.adherence * 100)}%.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    bullets,
    actions: [OPEN_WORKOUTS],
  };
}

/**
 * How the diary is going.
 *
 * Leads with whether today has been logged at all, because that is the one
 * thing still actionable right now; otherwise it reports the week's logging
 * rate against the goal. Never comments on whether the calorie target was hit
 * — the block scores on keeping the diary, not on the number in it, and an
 * answer that praised or scolded a specific total would be arguing with a
 * target the score itself does not enforce.
 */
function nutritionAnswer(analysis: CoachAnalysis): CoachAnswer {
  const { nutrition, metrics } = analysis;

  if (!nutrition.hasGoal) {
    return {
      headline: "Цель по питанию не задана",
      body: "Блок «Питание за неделю» даёт до 5 баллов индекса и сейчас пуст, потому что ему не с чем сравнивать записи. Задай дневную цель по калориям — дальше достаточно просто вести дневник.",
      bullets: [],
      actions: [OPEN_NUTRITION],
    };
  }

  const bullets: CoachBullet[] = [
    bullet(
      "nutrition-today",
      nutrition.isLoggedToday ? "positive" : "warning",
      nutrition.isLoggedToday
        ? `Сегодня уже ${Math.round(nutrition.caloriesToday)} ${caloriesWord(Math.round(nutrition.caloriesToday))} из ${nutrition.caloriesGoal}`
        : "Сегодня в дневнике пока пусто",
    ),
    bullet(
      "nutrition-water",
      nutrition.waterGoalMl > 0 && nutrition.waterTodayMl >= nutrition.waterGoalMl
        ? "positive"
        : "neutral",
      `Вода: ${nutrition.waterTodayMl} мл${nutrition.waterGoalMl > 0 ? ` из ${nutrition.waterGoalMl}` : ""}`,
    ),
  ];

  if (nutrition.loggingStreak >= 3) {
    bullets.push(
      bullet(
        "nutrition-streak",
        "positive",
        `Дневник ведётся ${nutrition.loggingStreak} ${daysWord(nutrition.loggingStreak)} подряд`,
      ),
    );
  }

  if (!nutrition.isLoggedToday) {
    return {
      headline: "Сегодня дневник ещё не открывали",
      body: `За неделю записи есть в ${metrics.nutritionDaysWeek} из 7 дней.${
        analysis.potential.fromNutrition > 0
          ? ` Один продукт сегодня — это ${analysis.potential.fromNutrition} ${pointsWord(analysis.potential.fromNutrition)} к индексу.`
          : ""
      }`,
      bullets,
      actions: [OPEN_NUTRITION],
    };
  }

  const adherencePercent = Math.round((nutrition.adherence ?? 0) * 100);

  return {
    headline: `За неделю дневник ведётся в ${metrics.nutritionDaysWeek} из 7 дней`,
    body: `Выполнение — ${adherencePercent}% от того, что просит цель.`,
    bullets,
    actions: [OPEN_NUTRITION],
  };
}

/**
 * How the care routines are going.
 *
 * Names the weakest *area* rather than listing every routine: a user with a
 * morning and an evening skincare routine, teeth and nails does not need four
 * percentages, they need to know which one is quietly slipping. The number
 * behind it is a real monthly adherence figure computed from the logs, so
 * "хуже всего кожа" is a claim this can back up.
 *
 * Photos get a line only when there is something true to say about them — an
 * app that nags for a selfie every day would be nagging for its own sake.
 */
function appearanceAnswer(analysis: CoachAnalysis): CoachAnswer {
  const { appearance, metrics, potential } = analysis;

  if (appearance.activeCount === 0) {
    return {
      headline: "Уход пока не настроен",
      body: "Блок «Уход за неделю» даёт до 5 баллов индекса и сейчас пуст. Достаточно одной процедуры с расписанием — например, вечернего ухода за кожей.",
      bullets: [],
      actions: [OPEN_APPEARANCE],
    };
  }

  const bullets: CoachBullet[] = [
    bullet(
      "appearance-today",
      metrics.appearanceRemaining === 0 ? "positive" : "warning",
      metrics.appearanceRemaining === 0
        ? `Сегодня закрыто всё, что запланировано: ${appearance.doneToday} из ${appearance.dueToday}`
        : `Сегодня выполнено ${appearance.doneToday} из ${appearance.dueToday}, осталось ${metrics.appearanceRemaining} ${routinesWord(metrics.appearanceRemaining)}`,
    ),
  ];

  if (appearance.streak >= 3) {
    bullets.push(
      bullet(
        "appearance-streak",
        "positive",
        `Уход без пропусков ${appearance.streak} ${daysWord(appearance.streak)} подряд`,
      ),
    );
  }

  if (appearance.weakestArea && (appearance.weakestAreaAdherence ?? 1) < 0.7) {
    bullets.push(
      bullet(
        "appearance-area",
        "warning",
        `Слабее всего зона «${appearance.weakestArea}» — ${Math.round((appearance.weakestAreaAdherence ?? 0) * 100)}% за месяц`,
      ),
    );
  }

  if (appearance.photosTotal === 0) {
    bullets.push(
      bullet(
        "appearance-photo",
        "neutral",
        "Фото прогресса нет — без них изменения не с чем сравнить",
      ),
    );
  } else if (appearance.daysSinceLastPhoto !== null && appearance.daysSinceLastPhoto >= 30) {
    bullets.push(
      bullet(
        "appearance-photo",
        "neutral",
        `Последнее фото было ${appearance.daysSinceLastPhoto} ${daysWord(appearance.daysSinceLastPhoto)} назад`,
      ),
    );
  }

  if (metrics.appearanceRemaining > 0) {
    return {
      headline: appearance.nextTitle
        ? `Осталось закрыть «${appearance.nextTitle}»`
        : `На сегодня осталось ${metrics.appearanceRemaining} ${routinesWord(metrics.appearanceRemaining)}`,
      body: `За неделю уход выполнен на ${Math.round((appearance.adherence ?? 0) * 100)}%.${
        potential.fromAppearance > 0
          ? ` Закроешь сегодняшнее — это ${potential.fromAppearance} ${pointsWord(potential.fromAppearance)} к индексу.`
          : ""
      }`,
      bullets,
      actions: [OPEN_APPEARANCE],
    };
  }

  return {
    headline: `Уход за неделю выполнен на ${Math.round((appearance.adherence ?? 0) * 100)}%`,
    body:
      appearance.goalsActive > 0
        ? `Сегодня всё закрыто. В работе целей по внешности: ${appearance.goalsActive}.`
        : "Сегодня всё закрыто. Регулярность здесь важнее интенсивности — её и держи.",
    bullets,
    actions: [OPEN_APPEARANCE],
  };
}

function overdueAnswer(analysis: CoachAnalysis): CoachAnswer {
  const overdue = analysis.tasks
    .filter((task) => task.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const lateGoals = analysis.goals.filter(
    (goal) => !goal.isCompleted && goal.daysLeft !== null && goal.daysLeft < 0,
  );

  if (overdue.length === 0 && lateGoals.length === 0) {
    return {
      headline: "Просроченного нет",
      body: `Ни одной задачи и ни одной цели с прошедшим сроком. Штрафа за просрочку в индексе сейчас тоже нет — это ${analysis.metrics.lifeScore.score} из 100 без вычетов.`,
      bullets: [],
      actions: [OPEN_TASKS],
    };
  }

  const bullets: CoachBullet[] = [
    ...overdue.slice(0, 4).map((task) =>
      bullet(
        `late-${task.id}`,
        task.daysOverdue >= 3 ? "critical" : "warning",
        `«${task.title}» — ${task.daysOverdue} ${pluralizeRu(task.daysOverdue, ["день", "дня", "дней"])} просрочки`,
      ),
    ),
    ...lateGoals.slice(0, 2).map((goal) =>
      bullet("late-goal-" + goal.id, "critical", `Цель «${goal.title}» — ${deadlinePhrase(goal)}`),
    ),
  ];

  const gain = analysis.potential.fromOverdueTasks;

  return {
    headline:
      overdue.length > 0
        ? `${agree(overdue.length, ["Просрочена", "Просрочено", "Просрочено"])} ${overdue.length} ${tasksWord(overdue.length)}`
        : `Просрочено целей: ${lateGoals.length}`,
    body:
      gain > 0
        ? `Просрочка — единственное, что вычитается из индекса напрямую. Разбор всего списка вернёт ${gain} ${pointsWord(gain)}.`
        : "Разбери список сверху вниз: сначала то, что просрочено дольше всего.",
    bullets,
    actions: [OPEN_TASKS, ...(lateGoals.length > 0 ? [OPEN_GOALS] : [])],
  };
}

function eveningAnswer(analysis: CoachAnalysis): CoachAnswer {
  if (isEmptyAccount(analysis)) return emptyAnswer(analysis);

  const { metrics } = analysis;
  const owed = analysis.habits.filter((habit) => habit.isDueToday && !habit.isDoneToday);
  const dueToday = analysis.tasks.filter((task) => task.isDueToday);

  const owedWorkouts = analysis.workouts.filter(
    (workout) => (workout.isPlannedToday && !workout.isDoneToday) || workout.isOpenToday,
  );

  const bullets: CoachBullet[] = [];
  if (owedWorkouts.length > 0) {
    bullets.push(
      bullet(
        "evening-workouts",
        "warning",
        `${agree(owedWorkouts.length, ["Не закрыта", "Не закрыто", "Не закрыто"])} ${owedWorkouts.length} ${workoutsWord(owedWorkouts.length)}: ${owedWorkouts
          .map((workout) => workout.title)
          .join(", ")}`,
      ),
    );
  }
  if (owed.length > 0) {
    bullets.push(
      bullet(
        "evening-habits",
        "warning",
        `${agree(owed.length, ["Не отмечена", "Не отмечено", "Не отмечено"])} ${owed.length} ${habitsWord(owed.length)}: ${owed.map((habit) => habit.title).join(", ")}`,
      ),
    );
  }
  if (dueToday.length > 0) {
    bullets.push(
      bullet("evening-tasks", "warning", `Осталось на сегодня: ${dueToday.map((task) => task.title).join(", ")}`),
    );
  }
  if (metrics.tasksCompletedToday > 0) {
    bullets.push(
      bullet(
        "evening-done",
        "positive",
        `Сегодня ${agree(metrics.tasksCompletedToday, ["закрыта", "закрыто", "закрыто"])} ${metrics.tasksCompletedToday} ${tasksWord(metrics.tasksCompletedToday)}`,
      ),
    );
  }

  if (owed.length === 0 && dueToday.length === 0 && owedWorkouts.length === 0) {
    return {
      headline: "День закрыт чисто",
      body: `Ни одной несделанной привычки, задачи или тренировки на сегодня. Индекс ${metrics.lifeScore.score} из 100. Лучшее вложение на вечер — поставить одну задачу на завтра, чтобы утро началось не с выбора.`,
      bullets,
      actions: [{ id: "plan-tomorrow", label: "Запланировать завтра", target: "tasks" }],
    };
  }

  const remaining = owed.length + dueToday.length + owedWorkouts.length;
  // A rough budget, and the ordering the body recommends follows from it:
  // habits are minutes, tasks are a quarter of an hour, a workout is an hour.
  const minutes = owed.length * 5 + dueToday.length * 15 + owedWorkouts.length * 60;

  return {
    headline: "Вечер решает, каким будет счёт дня",
    body: `${agree(remaining, ["Остался", "Осталось", "Осталось"])} ${remaining} ${pluralizeRu(remaining, ["пункт", "пункта", "пунктов"])} — примерно ${minutes} ${pluralizeRu(minutes, ["минута", "минуты", "минут"])}. ${
      owedWorkouts.length > 0 && analysis.profile.localHour >= 21
        ? "Тренировка в такое время — решение на твоё усмотрение; привычки и задачи закрываются быстрее."
        : "Привычки быстрее, начни с них."
    }`,
    bullets,
    actions: [
      ...(owedWorkouts.length > 0 ? [OPEN_WORKOUTS] : []),
      ...(owed.length > 0 ? [OPEN_HABITS] : []),
      ...(dueToday.length > 0 ? [OPEN_TASKS] : []),
    ],
  };
}

function goalAnswer(analysis: CoachAnalysis): CoachAnswer {
  const goal = focusGoal(analysis);

  if (!goal) {
    return {
      headline: "Цели пока нет",
      body: "Без цели остальное превращается в список дел без направления. Сформулируй одну и разбей на шаги — прогресс по ней считается по выполненным шагам, а не по ощущению.",
      bullets: [],
      actions: [{ id: "add-goal", label: "Поставить цель", target: "goals" }],
    };
  }

  const bullets: CoachBullet[] = [
    bullet("goal-progress", goal.percent >= 50 ? "positive" : "neutral", `Прогресс ${goal.percent}%`),
  ];

  if (goal.hasSteps) {
    bullets.push(
      bullet(
        "goal-steps",
        goal.remainingSteps > 0 ? "neutral" : "positive",
        `Осталось шагов: ${goal.remainingSteps}`,
      ),
    );
  } else {
    bullets.push(
      bullet("goal-nosteps", "warning", "У цели нет шагов — прогресс считать не по чему"),
    );
  }

  if (goal.daysLeft !== null) {
    bullets.push(
      bullet(
        "goal-deadline",
        goal.daysLeft < 0 ? "critical" : goal.daysLeft <= 3 ? "warning" : "neutral",
        `Срок — ${deadlinePhrase(goal)}`,
      ),
    );
  }

  const pace =
    goal.hasSteps && goal.remainingSteps > 0 && goal.daysLeft !== null && goal.daysLeft > 0
      ? `Чтобы успеть, нужно закрывать примерно ${Math.ceil(goal.remainingSteps / goal.daysLeft)} ${pluralizeRu(Math.ceil(goal.remainingSteps / goal.daysLeft), ["шаг", "шага", "шагов"])} в день.`
      : goal.hasSteps
        ? "Возьми ближайший невыполненный шаг и закрой его сегодня."
        : "Разбей её на шаги — без них ускоряться нечему.";

  return {
    headline: `Быстрее всего — «${goal.title}»`,
    body: pace,
    bullets,
    actions: [OPEN_GOALS],
  };
}

function mistakesAnswer(analysis: CoachAnalysis): CoachAnswer {
  const { metrics } = analysis;
  const mistakes: CoachBullet[] = [];

  if (metrics.tasksOverdue > 0) {
    mistakes.push(
      bullet(
        "m-overdue",
        "critical",
        `${metrics.tasksOverdue} ${tasksWord(metrics.tasksOverdue)} ${agree(metrics.tasksOverdue, ["просрочена", "просрочены", "просрочены"])} — это единственный прямой штраф в индексе`,
      ),
    );
  }

  const abandoned = analysis.habits.filter((habit) => habit.adherence < 0.4);
  if (abandoned.length > 0) {
    mistakes.push(
      bullet(
        "m-habits",
        "critical",
        `${agree(abandoned.length, ["Заброшена", "Заброшено", "Заброшено"])} ${abandoned.length} ${habitsWord(abandoned.length)}: ${abandoned.map((habit) => habit.title).join(", ")}`,
      ),
    );
  }

  const stepless = analysis.goals.filter((goal) => !goal.isCompleted && !goal.hasSteps);
  if (stepless.length > 0) {
    mistakes.push(
      bullet(
        "m-steps",
        "warning",
        `${stepless.length} ${pluralizeRu(stepless.length, ["цель", "цели", "целей"])} без шагов — ${agree(stepless.length, ["по ней", "по ним", "по ним"])} нельзя измерить прогресс`,
      ),
    );
  }

  if (metrics.tasksOpen > 12) {
    mistakes.push(
      bullet("m-backlog", "warning", `${metrics.tasksOpen} открытых задач — список перестал быть планом`),
    );
  }

  if (analysis.habits.length === 0) {
    mistakes.push(bullet("m-nohabits", "warning", "Нет ни одной привычки — 20 баллов индекса недоступны"));
  }

  if (analysis.workouts.length === 0) {
    mistakes.push(
      bullet("m-noworkouts", "warning", "Нет ни одной тренировки — 15 баллов индекса недоступны"),
    );
  } else if (metrics.workoutsWeek === 0) {
    mistakes.push(
      bullet(
        "m-training",
        "critical",
        "За неделю ни одной выполненной тренировки при непустом списке программ",
      ),
    );
  }

  if (!analysis.nutrition.hasGoal) {
    mistakes.push(
      bullet("m-nonutrition", "warning", "Цель по питанию не задана — 5 баллов индекса недоступны"),
    );
  } else if ((analysis.nutrition.adherence ?? 0) < 0.4) {
    mistakes.push(
      bullet(
        "m-nutrition",
        "critical",
        `Дневник питания ведётся меньше чем в половине дней недели: ${metrics.nutritionDaysWeek} из 7`,
      ),
    );
  }

  if (analysis.appearance.activeCount === 0) {
    mistakes.push(
      bullet(
        "m-noappearance",
        "warning",
        "Нет ни одной процедуры ухода — 5 баллов индекса недоступны",
      ),
    );
  } else if ((analysis.appearance.adherence ?? 0) < 0.4) {
    mistakes.push(
      bullet(
        "m-appearance",
        "critical",
        analysis.appearance.weakestArea
          ? `Уход выполняется меньше чем наполовину, хуже всего — «${analysis.appearance.weakestArea}»`
          : "Уход за неделю выполнен меньше чем наполовину",
      ),
    );
  }

  const staleWorkouts = analysis.workouts.filter(
    (workout) => workout.adherence !== null && workout.adherence < 0.4,
  );
  if (staleWorkouts.length > 0) {
    mistakes.push(
      bullet(
        "m-workout-plan",
        "warning",
        `План не выполняется у ${staleWorkouts.length} ${pluralizeRu(staleWorkouts.length, ["тренировки", "тренировок", "тренировок"])}: ${staleWorkouts
          .slice(0, 2)
          .map((workout) => workout.title)
          .join(", ")}`,
      ),
    );
  }

  if (metrics.tasksCompletedWeek === 0 && metrics.tasksOpen > 0) {
    mistakes.push(
      bullet("m-throughput", "critical", "За неделю не закрыто ни одной задачи при непустом списке"),
    );
  }

  if (mistakes.length === 0) {
    return {
      headline: "Системных ошибок не вижу",
      body: `Просрочки нет, заброшенных привычек нет, список задач под контролем. Индекс ${metrics.lifeScore.score} из 100 — дальше растёт только объёмом, не разбором завалов.`,
      bullets: [],
      actions: [OPEN_GOALS],
    };
  }

  return {
    headline: `Нашёл ${mistakes.length} ${pluralizeRu(mistakes.length, ["слабое место", "слабых места", "слабых мест"])}`,
    body: "Это не про дисциплину, а про структуру: каждое из них чинится одним действием, а не силой воли.",
    bullets: mistakes.slice(0, 5),
    actions: briefActions(analysis),
  };
}

function nextStepAnswer(analysis: CoachAnalysis): CoachAnswer {
  const now = nowAnswer(analysis);
  const potential = potentialLine(analysis);

  return {
    ...now,
    headline: now.headline.replace(/^Сейчас: /, "Следующий шаг: "),
    body: potential ? `${now.body} ${potential}` : now.body,
  };
}
