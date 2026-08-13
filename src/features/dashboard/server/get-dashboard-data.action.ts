"use server";

import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { addDays, diffDays, todayIn } from "@/shared/lib/calendar-day";
import {
  getActivityCounts,
  getFocusOfDay,
} from "@/features/activity/server/activity.repository";
import { buildCoachAnalysis } from "@/features/coach/server/build-coach-analysis";
import { composeAnswer } from "@/features/coach/lib/compose";
import { actionHref } from "@/features/coach/lib/tone";
import { listEntries, listWater, getGoal } from "@/features/nutrition/server/nutrition.repository";
import { dayProgress, entriesOnDay, entryMacros } from "@/features/nutrition/lib/stats";
import { MEAL_SLOTS } from "@/features/nutrition/schemas";
import { listLogs as listSleepLogs } from "@/features/sleep/server/sleep.repository";
import { sleepScore } from "@/features/sleep/lib/score";
import { logOnDay as sleepLogOnDay } from "@/features/sleep/lib/stats";
import { listWorkouts, listSessions } from "@/features/workouts/server/workouts.repository";
import { workoutStats } from "@/features/workouts/lib/stats";
import { buildDayScore } from "@/features/dashboard/lib/day-score";
import { buildTodayPlan } from "@/features/dashboard/lib/today-plan";
import { getActivePath } from "@/features/path/server/path.repository";
import { pathProgress, stageCaption } from "@/features/path/lib/progress";
import type { CoachBulletTone } from "@/features/coach/types";
import type { MealSlot } from "@/features/nutrition/types";
import type { SleepLogItem } from "@/features/sleep/types";
import type { WorkoutSessionItem } from "@/features/workouts/types";

/** How far back the health queries reach. Enough for the sleep norm's fortnight. */
const HEALTH_WINDOW_DAYS = 16;

/**
 * The Dashboard in one fetch.
 *
 * The Life Score and the Coach preview both come out of buildCoachAnalysis
 * rather than being computed here. That is the point: this action used to run
 * its own habit/task aggregates and its own rule-based insight generator, which
 * meant the Dashboard and the Coach were two independent opinions about the
 * same day and could disagree about the score, about what was overdue, or about
 * what to do next. One analysis, two renderings.
 *
 * WHAT THIS LAYER ADDS ON TOP OF THE READINGS. The screen used to receive four
 * raw numbers — calories, minutes slept, sessions done, millilitres — and had to
 * leave the interpretation to the person reading it. `health` and `plan` below
 * are that interpretation, and they are the difference between a tracker and a
 * coach: `health` says how the body is, `plan` says what happens next. Neither
 * invents a figure — see the headers of health-scores.ts and today-plan.ts,
 * which document exactly which numbers are derived and which are conventional.
 */
export async function getDashboardData(rawInitData: string | undefined) {
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.findUniqueOrThrow({
    where: { telegramId: identity.telegramId },
    include: { profile: true },
  });

  if (!user.profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const timezone = user.profile.timezone;
  // Взят один раз здесь, а не читается из user.profile ниже: прогресс пути
  // считается в замыкании, и сужение типа по проверке выше туда не доезжает.
  const currentWeightKg = user.profile.weightKg;
  const today = todayIn(timezone);
  const windowStart = addDays(today, -HEALTH_WINDOW_DAYS);

  const [
    analysis,
    counts,
    focus,
    entries,
    water,
    goal,
    sleepLogs,
    workouts,
    sessions,
    activePath,
  ] = await Promise.all([
    buildCoachAnalysis(user.id, timezone),
    getActivityCounts(user.id),
    getFocusOfDay(user.id),
    listEntries(user.id, windowStart),
    listWater(user.id, windowStart),
    getGoal(user.id),
    listSleepLogs(user.id, windowStart),
    listWorkouts(user.id, timezone),
    listSessions(user.id, windowStart),
    getActivePath(user.id),
  ]);

  const brief = composeAnswer("brief", analysis);

  // The loudest bullet, not the first: a critical line buried under two
  // neutral ones is exactly the thing a one-line preview exists to surface.
  const severity: Record<CoachBulletTone, number> = {
    critical: 0,
    warning: 1,
    positive: 2,
    neutral: 3,
  };
  const highlight =
    [...brief.bullets].sort((a, b) => severity[a.tone] - severity[b.tone])[0] ?? null;

  // The first action that actually leads somewhere. An action with a null
  // target is advice with nowhere to tap, and a card whose primary button does
  // nothing is worse than a card with no button.
  const primaryAction =
    brief.actions.map((action) => ({ action, href: actionHref(action.target) })).find(
      (candidate): candidate is { action: (typeof brief.actions)[number]; href: string } =>
        candidate.href !== null,
    ) ?? null;

  const nutrition = dayProgress(entries, water, goal, today);

  // Last night is keyed to the morning woken up on, so "today" is the right key
  // — see the note on SleepLogItem.
  const sleep = sleepScore(sleepLogs, today, today);

  const activeWorkouts = workouts.filter((workout) => workout.archivedAt === null);
  const todayWorkouts = activeWorkouts
    .map((workout) => ({ workout, stats: workoutStats(workout, sessions, today, windowStart) }))
    .filter((row) => row.stats.isPlannedToday || row.stats.isDoneToday || row.stats.isOpenToday);

  const doneToday = todayWorkouts.filter((row) => row.stats.isDoneToday).length;
  const openToday = todayWorkouts.find((row) => row.stats.isOpenToday) ?? null;
  const nextToday = todayWorkouts.find((row) => !row.stats.isDoneToday) ?? null;
  const targetWorkout = openToday ?? nextToday;

  // --- Inputs the interpretation layer needs -------------------------------

  const completedSessions = sessions.filter((session) => session.completedAt !== null);

  /**
   * NOVA Score — четыре доли выполнения сегодняшнего дня и их среднее.
   *
   * Раньше здесь считались «состояния организма» (Энергия, Сон, Питание,
   * Восстановление) — четыре интерпретации с вердиктами, — а рядом в ответе
   * ехал индекс из девяти блоков, и на экране они стояли в одной карточке, не
   * складываясь друг в друга. Теперь главный экран показывает ровно одно
   * измерение: сколько из запланированного на сегодня сделано. Индекс за период
   * остался в Отчётах и в Профиле, где отвечает на свой вопрос.
   */
  const dayScore = buildDayScore({
    nutrition: {
      calories: nutrition.calories.value,
      caloriesGoal: nutrition.calories.goal,
      waterMl: nutrition.waterMl.value,
      waterGoalMl: nutrition.waterMl.goal,
    },
    workout: { plannedToday: todayWorkouts.length, doneToday },
    sleep: {
      // Длительность, а не оценка ночи: доля считается от нормы сна, и брать
      // сюда sleepScore значило бы делить один составной балл (сон + режим +
      // качество) на другой — число без смысла.
      lastNightMin: sleepLogOnDay(sleepLogs, today)?.durationMin ?? null,
      normMin: sleep.norm.targetMin,
    },
  });

  /**
   * Путь — сжатый до того, что показывает главный экран.
   *
   * Три поля вместо целого маршрута, и это не экономия байтов: главный экран
   * отвечает на «что делать сейчас», а список этапов — на «куда я иду», и второй
   * вопрос принадлежит экрану пути. Прогресс считает та же pathProgress, что и
   * там, поэтому процент на двух экранах не может разойтись.
   *
   * null — пути нет, и это состояние карточки «не знаешь, с чего начать», а не
   * отсутствие данных.
   */
  const pathSummary = (() => {
    if (activePath === null) return null;

    const progress = pathProgress(activePath, currentWeightKg);

    return {
      id: activePath.id,
      title: activePath.title,
      percent: progress.percent,
      stageCaption: stageCaption(progress),
      nextStepTitle: progress.nextStep?.title ?? null,
    };
  })();

  const todayEntries = entriesOnDay(entries, today);

  const plan = buildTodayPlan({
    nowMinutes: minutesOfDayIn(timezone),
    meals: MEAL_SLOTS.map((slot) => {
      const slotEntries = todayEntries.filter((entry) => entry.mealSlot === slot);
      return {
        slot: slot as MealSlot,
        isLogged: slotEntries.length > 0,
        calories: slotEntries.reduce((total, entry) => total + entryMacros(entry).calories, 0),
      };
    }),
    proteinGapG: Math.max(0, nutrition.proteinG.goal - nutrition.proteinG.value),
    workout: {
      /**
       * Программа дня — та, что предстоит, а когда всё закрыто, последняя
       * выполненная. Без второй половины строка тренировки просто пропадала
       * бы из плана в тот момент, когда её закрыли: расписание, вычёркивающее
       * сделанное, лишает человека единственного доказательства, что день
       * прожит по плану.
       */
      title: (targetWorkout ?? todayWorkouts[0])?.workout.title ?? null,
      isRestDay: todayWorkouts.length === 0,
      isDone: targetWorkout === null && todayWorkouts.length > 0,
      isOpen: openToday !== null,
      exerciseCount:
        (targetWorkout ?? todayWorkouts[0])?.workout.exercises.filter(
          (exercise) => exercise.archivedAt === null,
        ).length ?? 0,
      usualHour: usualCompletionHour(completedSessions, timezone),
    },
    water: { ml: nutrition.waterMl.value, goalMl: nutrition.waterMl.goal },
    sleep: {
      usualBedTime: usualBedTime(sleepLogs, today),
      isLoggedToday: sleep.score !== null,
      normMin: sleep.norm.targetMin,
    },
  });

  return {
    user: {
      firstName: analysis.profile.firstName,
      photoUrl: user.photoUrl,
    },
    timezone,
    today,
    /**
     * NOVA Score: четыре доли выполнения дня и их среднее. Экран рисует их
     * дословно — ни порогов, ни таблиц вердиктов, ни логики «что значит 58» в
     * компоненте.
     */
    dayScore,
    /** Today, as a schedule. Empty only when there is genuinely nothing to place. */
    plan,
    coach: {
      headline: brief.headline,
      body: brief.body,
      /**
       * The consequence, not the observation — what makes the card an argument
       * rather than a notification. Optional in CoachAnswer, so it is optional
       * here, and the card drops the "Почему" block when it is absent.
       */
      rationale: brief.rationale ?? null,
      highlight: highlight ? { text: highlight.text, tone: highlight.tone } : null,
      /** The one thing to do about it, and where it leads. */
      action: primaryAction
        ? { label: primaryAction.action.label, href: primaryAction.href }
        : null,
      /** Points still available today — 0 when there is nothing left to gain. */
      potential: analysis.potential.total,
    },
    /**
     * Сегодняшняя тренировка — единственное сырое чтение, оставшееся в ответе.
     *
     * Остальные плитки («Питание», «Сон», «Вода») уехали в `health`, где то же
     * измерение уже интерпретировано. Держать рядом два представления одного
     * дня — ровно та ошибка, от которой предостерегает заголовок этого файла:
     * два независимых мнения об одном факте рано или поздно разойдутся.
     */
    todayWorkout: {
      title: targetWorkout?.workout.title ?? null,
      workoutId: targetWorkout?.workout.id ?? null,
      plannedToday: todayWorkouts.length,
      doneToday,
      isOpen: openToday !== null,
      isRestDay: todayWorkouts.length === 0,
    },
    focus,
    counts,
    /**
     * Путь — сжатый до того, что показывает главный экран.
     *
     * Здесь три поля вместо целого маршрута, и это не экономия байтов: главный
     * экран отвечает на «что делать сейчас», а список этапов — на «куда я иду»,
     * и второй вопрос принадлежит экрану пути. Прогресс считает та же
     * pathProgress, что и там, поэтому процент на двух экранах не может
     * разойтись.
     *
     * null — пути нет, и это состояние карточки «не знаешь, с чего начать»,
     * а не отсутствие данных.
     */
    path: pathSummary,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

// ---------------------------------------------------------------------------
// Derivations the schedule needs
// ---------------------------------------------------------------------------

/** Local time as minutes past midnight, in the user's own zone. */
function minutesOfDayIn(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return hour * 60 + minute;
}

/**
 * The hour this person usually finishes training, from their own history.
 *
 * The median rather than the mean: one session closed at two in the morning
 * would drag an average across the evening, and the schedule would start
 * claiming the user trains at 21:00. Null below three sessions — two data
 * points are not a habit, and the plan row shows "по плану" instead of a
 * fabricated time.
 */
function usualCompletionHour(
  sessions: WorkoutSessionItem[],
  timezone: string,
): number | null {
  const hours = sessions
    .map((session) => session.completedAt)
    .filter((value): value is string => value !== null)
    .map((value) =>
      Number(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          hourCycle: "h23",
          timeZone: timezone,
        }).format(new Date(value)),
      ),
    )
    .filter((hour) => Number.isFinite(hour))
    .sort((a, b) => a - b);

  if (hours.length < 3) return null;

  return hours[Math.floor(hours.length / 2)];
}

/**
 * The bedtime this person actually keeps, as "HH:mm".
 *
 * Measured on the same evening-is-negative scale the sleep score uses, so a
 * 23:40 and a 00:20 bedtime average to midnight rather than to midday. Null
 * below three nights, for the same reason the training hour is.
 */
function usualBedTime(logs: SleepLogItem[], today: string): string | null {
  const offsets = logs
    .filter((log) => diffDays(addDays(today, -13), log.day) >= 0)
    .map((log) => {
      const match = /^(\d{2}):(\d{2})$/.exec(log.bedTime);
      if (!match) return null;

      const minutes = Number(match[1]) * 60 + Number(match[2]);
      return minutes >= 12 * 60 ? minutes - 24 * 60 : minutes;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (offsets.length < 3) return null;

  const median = offsets[Math.floor(offsets.length / 2)];
  const normalized = ((median % 1440) + 1440) % 1440;

  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}
