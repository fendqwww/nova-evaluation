import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { formatStreak } from "@/features/habits/lib/stats";
import { PRIMARY_GOAL_LABELS } from "@/features/onboarding/schemas";
import {
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
 * question when no model is configured. When Claude *is* configured it writes
 * the prose over these same facts (see server/claude.ts); it never gets to
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

function tasksWord(count: number): string {
  return pluralizeRu(count, ["задача", "задачи", "задач"]);
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
      { id: "first-task", label: "Добавить задачу", target: "tasks" },
    ],
  };
}

function isEmptyAccount(analysis: CoachAnalysis): boolean {
  return (
    analysis.goals.length === 0 &&
    analysis.habits.length === 0 &&
    analysis.tasks.length === 0 &&
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

  const bullets: CoachBullet[] = [];
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

  if (owed.length === 0 && dueToday.length === 0) {
    return {
      headline: "День закрыт чисто",
      body: `Ни одной несделанной привычки и ни одной задачи на сегодня. Индекс ${metrics.lifeScore.score} из 100. Лучшее вложение на вечер — поставить одну задачу на завтра, чтобы утро началось не с выбора.`,
      bullets,
      actions: [{ id: "plan-tomorrow", label: "Запланировать завтра", target: "tasks" }],
    };
  }

  const remaining = owed.length + dueToday.length;
  const minutes = owed.length * 5 + dueToday.length * 15;

  return {
    headline: "Вечер решает, каким будет счёт дня",
    body: `${agree(remaining, ["Остался", "Осталось", "Осталось"])} ${remaining} ${pluralizeRu(remaining, ["пункт", "пункта", "пунктов"])} — примерно ${minutes} ${pluralizeRu(minutes, ["минута", "минуты", "минут"])}. Привычки быстрее, начни с них.`,
    bullets,
    actions: [
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
