import "server-only";
import { db } from "@/server/db";
import {
  addDays,
  dayInZone,
  diffDays,
  formatDay,
  hourIn,
  todayIn,
  weekdayIndex,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import {
  SCORING_WINDOW_DAYS,
  calculateLifeScore,
} from "@/features/life-score/server/calculate-life-score";
import type { LifeScoreInput } from "@/features/life-score/types";
import {
  LOG_WINDOW_DAYS,
  getHabitAdherence,
  listHabits,
} from "@/features/habits/server/habits.repository";
import { getGoalStanding, listGoals } from "@/features/goals/server/goals.repository";
import { getTaskThroughput, listTasks } from "@/features/tasks/server/tasks.repository";
import {
  SESSION_WINDOW_DAYS,
  getWorkoutAdherence,
  listSessions,
  listWorkouts,
} from "@/features/workouts/server/workouts.repository";
import {
  NUTRITION_SCORING_WINDOW_DAYS,
  getGoal,
  getNutritionAdherence,
  listEntries,
  listWater,
} from "@/features/nutrition/server/nutrition.repository";
import {
  APPEARANCE_SCORING_WINDOW_DAYS,
  getAppearanceAdherence,
  listCareGoals,
  listPhotos,
  listRoutines,
} from "@/features/appearance/server/appearance.repository";
import {
  areaBreakdown,
  careStreak,
  completionsOn,
  remainingOn,
} from "@/features/appearance/lib/stats";
import { photoCountsByArea } from "@/features/appearance/lib/history";
import { areaLabel } from "@/features/appearance/lib/areas";
import { listLogs as listSleepLogs } from "@/features/sleep/server/sleep.repository";
import {
  SLEEP_GOAL_MIN,
  logOnDay as sleepLogOnDay,
  loggingStreak as sleepLoggingStreak,
  weekStats as sleepWeekStats,
} from "@/features/sleep/lib/stats";
import {
  dayProgress,
  entriesOnDay,
  entryMacros,
  loggingStreak,
  sumMacros,
  waterOnDay,
} from "@/features/nutrition/lib/stats";
import { MEAL_SLOT_LABELS, MEAL_SLOTS } from "@/features/nutrition/schemas";
import { habitStats } from "@/features/habits/lib/stats";
import { scheduleSummary } from "@/features/habits/lib/schedule";
import { workoutStats, sessionStats } from "@/features/workouts/lib/stats";
import { planSummary, hasPlan } from "@/features/workouts/lib/plan";
import { categoryLabel } from "@/features/workouts/lib/categories";
import { goalProgress, daysUntil } from "@/features/goals/lib/format";
import { bmiLabel, bmiOf, computePotential } from "@/features/coach/lib/analyze";
import type {
  CoachAnalysis,
  CoachAppearanceFact,
  CoachClockFacts,
  CoachGoalFact,
  CoachHabitFact,
  CoachMealLine,
  CoachMetrics,
  CoachNutritionFact,
  CoachSessionFact,
  CoachSleepFact,
  CoachSleepNight,
  CoachTaskFact,
  CoachTrends,
  CoachWorkoutFact,
} from "@/features/coach/types";
import type { NutritionEntryItem } from "@/features/nutrition/types";
import type { SleepLogItem } from "@/features/sleep/types";
import type {
  GenderValue,
  OccupationValue,
  PrimaryGoalValue,
} from "@/features/onboarding/schemas";

/**
 * Everything the Coach knows, assembled once per answer.
 *
 * The whole point of this module is that the Coach never invents a number.
 * Profile, goals, habits and tasks are read here, the Life Score is run through
 * the same function the Dashboard uses, and *yesterday* is rebuilt from the
 * same tables rather than from a stored snapshot — HabitLog carries the day it
 * happened, Task and Goal carry when they were created and closed, so a past
 * day is a query, not a record that has to have been written at the time. That
 * matters most for the user who did not open the app yesterday: a snapshot
 * table would simply have no row for them.
 *
 * What is genuinely not reconstructible is called out where it happens: height
 * and weight have no history, and a habit archived today is excluded from
 * yesterday's adherence too.
 */
/** How far back the diary is read: this week and the one it is compared to. */
const NUTRITION_TREND_DAYS = 14;

/** How many finished sessions travel with the analysis, newest first. */
const RECENT_SESSION_COUNT = 6;

/** How many meals of today's diary are named. A day has four slots. */
const MEAL_ITEM_CAP = 6;

export async function buildCoachAnalysis(
  userId: string,
  timezone: string,
): Promise<CoachAnalysis> {
  const today = todayIn(timezone);
  const yesterday = addDays(today, -1);
  // The anchor every "неделю назад" figure is measured at: the same window
  // functions, run seven days earlier, which is what makes a trend a
  // comparison of like with like rather than of two different definitions.
  const weekAgo = addDays(today, -7);

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user.profile) throw new Error("PROFILE_NOT_FOUND");

  const profileRow = user.profile;
  const windowStart = addDays(today, -(LOG_WINDOW_DAYS - 1));
  const sessionWindowStart = addDays(today, -(SESSION_WINDOW_DAYS - 1));
  // Two weeks rather than one: today's totals and the streak need a few days,
  // but "стал есть на 300 ккал меньше, чем неделю назад" needs the week before
  // the current one as well. Still far short of the 90-day history
  // listNutrition ships to the screen.
  const nutritionWindowStart = addDays(today, -(NUTRITION_TREND_DAYS - 1));
  // Longer than the scoring window on purpose: the weakest-area breakdown the
  // Coach names is a monthly figure, and a week of logs would make it swing on
  // a single missed evening.
  const appearanceWindowStart = addDays(today, -29);

  const [
    goals,
    habits,
    tasks,
    workouts,
    sessions,
    nutritionEntries,
    nutritionWater,
    nutritionGoal,
    habitsToday,
    habitsYesterday,
    tasksToday,
    tasksYesterday,
    goalsToday,
    goalsYesterday,
    workoutsToday,
    workoutsYesterday,
    nutritionToday,
    nutritionYesterday,
    careRoutines,
    carePhotos,
    careGoals,
    appearanceToday,
    appearanceYesterday,
    sleepLogs,
    habitsPrevWeek,
    tasksPrevWeek,
    workoutsPrevWeek,
    nutritionPrevWeek,
  ] = await Promise.all([
    listGoals(userId),
    listHabits(userId, timezone, windowStart),
    listTasks(userId),
    listWorkouts(userId, timezone),
    listSessions(userId, sessionWindowStart),
    listEntries(userId, nutritionWindowStart),
    listWater(userId, nutritionWindowStart),
    getGoal(userId),
    getHabitAdherence(userId, timezone, today, SCORING_WINDOW_DAYS),
    getHabitAdherence(userId, timezone, yesterday, SCORING_WINDOW_DAYS),
    getTaskThroughput(userId, today, SCORING_WINDOW_DAYS, timezone),
    getTaskThroughput(userId, yesterday, SCORING_WINDOW_DAYS, timezone),
    getGoalStanding(userId, today, timezone),
    getGoalStanding(userId, yesterday, timezone),
    getWorkoutAdherence(userId, timezone, today, SCORING_WINDOW_DAYS),
    getWorkoutAdherence(userId, timezone, yesterday, SCORING_WINDOW_DAYS),
    getNutritionAdherence(userId, today, NUTRITION_SCORING_WINDOW_DAYS),
    getNutritionAdherence(userId, yesterday, NUTRITION_SCORING_WINDOW_DAYS),
    listRoutines(userId, timezone, appearanceWindowStart),
    listPhotos(userId, addDays(today, -365)),
    listCareGoals(userId, timezone),
    getAppearanceAdherence(userId, timezone, today, APPEARANCE_SCORING_WINDOW_DAYS),
    getAppearanceAdherence(userId, timezone, yesterday, APPEARANCE_SCORING_WINDOW_DAYS),
    // Same 30-day horizon the appearance breakdown uses: enough for a weekly
    // average and a streak without shipping the section's full history.
    listSleepLogs(userId, appearanceWindowStart),
    // The same four window functions, anchored a week back — the previous
    // week's readings, for the trends below.
    getHabitAdherence(userId, timezone, weekAgo, SCORING_WINDOW_DAYS),
    getTaskThroughput(userId, weekAgo, SCORING_WINDOW_DAYS, timezone),
    getWorkoutAdherence(userId, timezone, weekAgo, SCORING_WINDOW_DAYS),
    getNutritionAdherence(userId, weekAgo, NUTRITION_SCORING_WINDOW_DAYS),
  ]);

  const habitFacts: CoachHabitFact[] = habits
    .filter((habit) => habit.archivedAt === null)
    .map((habit) => {
      const stats = habitStats(habit, today, windowStart);
      return {
        id: habit.id,
        title: habit.title,
        schedule: scheduleSummary(habit.schedule),
        isDueToday: stats.isDueToday,
        isDoneToday: stats.isDoneToday,
        currentStreak: stats.currentStreak,
        streakUnit: stats.streakUnit,
        adherence: stats.adherence,
        weekDone: stats.week.done,
        weekTarget: stats.week.target,
      };
    });

  // Archived programmes are excluded for the same reason archived habits are:
  // they owe nothing, and what they earned before archiving is not evidence
  // about this week.
  const workoutFacts: CoachWorkoutFact[] = workouts
    .filter((workout) => workout.archivedAt === null)
    .map((workout) => {
      const stats = workoutStats(workout, sessions, today, sessionWindowStart);
      return {
        id: workout.id,
        title: workout.title,
        category: categoryLabel(workout.category),
        plan: planSummary(workout.weekdayMask),
        hasPlan: hasPlan(workout.weekdayMask),
        isPlannedToday: stats.isPlannedToday,
        isDoneToday: stats.isDoneToday,
        isOpenToday: stats.isOpenToday,
        currentStreak: stats.currentStreak,
        streakUnit: stats.streakUnit,
        adherence: stats.adherence,
        weekDone: stats.week.done,
        weekTarget: stats.week.target,
        lastDay: stats.lastDay,
        volumeKg: Math.round(stats.volumeKg),
      };
    });

  const openTasks = tasks.filter((task) => !task.isCompleted);
  const taskFacts: CoachTaskFact[] = openTasks.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    dueDate: task.dueDate,
    // diffDays is signed from the due day to today, so a past deadline is a
    // positive number of days late — which is the only form worth showing.
    daysOverdue: task.dueDate ? Math.max(0, diffDays(task.dueDate, today)) : 0,
    isDueToday: task.dueDate === today,
  }));

  const goalFacts: CoachGoalFact[] = goals.map((goal) => {
    const progress = goalProgress(goal);
    return {
      id: goal.id,
      title: goal.title,
      percent: progress.percent,
      remainingSteps: progress.remaining,
      hasSteps: progress.hasSteps,
      daysLeft: goal.targetDate ? daysUntil(goal.targetDate) : null,
      isCompleted: goal.isCompleted,
    };
  });

  const habitsDue = habitFacts.filter((habit) => habit.isDueToday).length;
  const habitsDone = habitFacts.filter(
    (habit) => habit.isDueToday && habit.isDoneToday,
  ).length;

  const tasksCompletedToday = tasks.filter(
    (task) => task.isCompleted && task.completedAt !== null && completedOn(task.completedAt, today, timezone),
  ).length;

  const workoutsPlannedToday = workoutFacts.filter((workout) => workout.isPlannedToday).length;
  const workoutsDoneToday = workoutFacts.filter((workout) => workout.isDoneToday).length;

  // Volume over the same trailing window the score uses, so "объём за неделю"
  // and "тренировок за неделю" describe the same seven days.
  const scoringWindowStart = addDays(today, -(SCORING_WINDOW_DAYS - 1));
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const workoutVolumeWeek = sessions
    .filter(
      (session) =>
        session.completedAt !== null && diffDays(scoringWindowStart, session.day) >= 0,
    )
    .reduce(
      (total, session) =>
        total + sessionStats(session, workoutById.get(session.workoutId)).volumeKg,
      0,
    );

  const todayNutritionProgress = dayProgress(nutritionEntries, nutritionWater, nutritionGoal, today);
  const isNutritionLoggedToday = nutritionEntries.some((entry) => entry.day === today);
  const nutritionStreak = loggingStreak(nutritionEntries, today);

  const currentWeekCalories = dailyCalories(nutritionEntries, addDays(today, -6), today);
  const prevWeekCalories = dailyCalories(nutritionEntries, addDays(today, -13), addDays(today, -7));

  const nutritionFact: CoachNutritionFact = {
    hasGoal: nutritionToday.hasGoal,
    caloriesGoal: nutritionGoal.calories,
    caloriesToday: todayNutritionProgress.calories.value,
    proteinTodayG: todayNutritionProgress.proteinG.value,
    fatTodayG: todayNutritionProgress.fatG.value,
    carbsTodayG: todayNutritionProgress.carbsG.value,
    waterTodayMl: todayNutritionProgress.waterMl.value,
    waterGoalMl: nutritionGoal.waterMl,
    isLoggedToday: isNutritionLoggedToday,
    loggingStreak: nutritionStreak,
    adherence: nutritionToday.hasGoal ? ratio(nutritionToday.daysLogged, nutritionToday.expected) : null,
    todayMeals: mealLines(entriesOnDay(nutritionEntries, today)),
    averageCaloriesWeek: mean(currentWeekCalories),
    averageCaloriesPrevWeek: mean(prevWeekCalories),
    averageProteinWeekG: mean(
      dailyProtein(nutritionEntries, addDays(today, -6), today),
    ),
    // Dry days count here, unlike calories: a day with no water logged is a
    // day the user drank nothing they told Nova about, and averaging it away
    // would quietly flatter the number.
    averageWaterWeekMl: Math.round(
      daysOf(addDays(today, -6), today).reduce(
        (total, day) => total + waterOnDay(nutritionWater, day),
        0,
      ) / 7,
    ),
    daysOnTargetWeek:
      nutritionGoal.calories === 0
        ? 0
        : currentWeekCalories.filter(
            (value) => Math.abs(value - nutritionGoal.calories) <= nutritionGoal.calories * 0.1,
          ).length,
  };

  // Archived routines are excluded for the same reason archived habits and
  // programmes are: they owe nothing, and what they earned before archiving is
  // not evidence about this week.
  const activeRoutines = careRoutines.filter((routine) => routine.archivedAt === null);
  const careRemaining = remainingOn(activeRoutines, today);
  const careDoneToday = completionsOn(activeRoutines, today);
  const careAreas = areaBreakdown(
    activeRoutines,
    photoCountsByArea(carePhotos),
    appearanceWindowStart,
    today,
  ).filter((area) => area.expected > 0);

  // Worst-first, and only where there was something to measure — an area with
  // no routines is not "going badly", it simply is not being tracked.
  const weakestArea = careAreas.reduce<(typeof careAreas)[number] | null>(
    (worst, area) => (worst === null || area.adherence < worst.adherence ? area : worst),
    null,
  );

  const lastPhotoDay = carePhotos.reduce<CalendarDay | null>(
    (latest, photo) => (latest === null || photo.day > latest ? photo.day : latest),
    null,
  );

  const appearanceFact: CoachAppearanceFact = {
    activeCount: activeRoutines.length,
    dueToday: careRemaining.length + careDoneToday,
    doneToday: careDoneToday,
    streak: careStreak(activeRoutines, today, appearanceWindowStart),
    adherence: activeRoutines.length === 0 ? null : ratio(appearanceToday.done, appearanceToday.expected),
    nextTitle: careRemaining[0]?.title ?? null,
    weakestArea: weakestArea ? areaLabel(weakestArea.area) : null,
    weakestAreaAdherence: weakestArea ? weakestArea.adherence : null,
    photosTotal: carePhotos.length,
    daysSinceLastPhoto: lastPhotoDay === null ? null : diffDays(lastPhotoDay, today),
    goalsActive: careGoals.filter((goal) => !goal.isCompleted).length,
  };

  // Sleep is reported to the Coach but deliberately not scored: the Life Score
  // has no sleep block, and inventing one here would make the ring disagree
  // with calculateLifeScore. The Coach can still talk about it, which is the
  // whole point of a fact that is not also a metric.
  const sleepWeek = sleepWeekStats(sleepLogs, today);
  const lastNight = sleepLogOnDay(sleepLogs, today);
  const nights7d = nightsBetween(sleepLogs, addDays(today, -6), today);
  const nightsPrev7d = nightsBetween(sleepLogs, addDays(today, -13), addDays(today, -7));
  const bedTimes = nights7d.map((night) => bedTimeMinutes(night.bedTime));

  const sleepFact: CoachSleepFact = {
    hasLogs: sleepLogs.length > 0,
    averageDurationMin: sleepWeek.averageDurationMin,
    averageQuality: sleepWeek.averageQuality,
    daysLoggedWeek: sleepWeek.daysLogged,
    streak: sleepLoggingStreak(sleepLogs, today),
    lastNightMin: lastNight?.durationMin ?? null,
    goalMin: SLEEP_GOAL_MIN,
    lastNightQuality: lastNight?.quality ?? null,
    lastNightBedTime: lastNight?.bedTime ?? null,
    lastNightWakeTime: lastNight?.wakeTime ?? null,
    average7dMin: mean(nights7d.map((night) => night.durationMin)),
    averagePrev7dMin: mean(nightsPrev7d.map((night) => night.durationMin)),
    debtWeekMin: nights7d.reduce(
      (total, night) => total + Math.max(0, SLEEP_GOAL_MIN - night.durationMin),
      0,
    ),
    nightsOnTargetWeek: nights7d.filter((night) => night.durationMin >= SLEEP_GOAL_MIN).length,
    // Meaningless below two nights — one bedtime has no spread, and reporting
    // zero would read as perfect regularity rather than as no evidence.
    bedTimeSpreadMin:
      bedTimes.length < 2 ? null : Math.max(...bedTimes) - Math.min(...bedTimes),
    recentNights: nights7d.map(
      (night): CoachSleepNight => ({
        day: night.day,
        durationMin: night.durationMin,
        quality: night.quality,
        bedTime: night.bedTime,
        wakeTime: night.wakeTime,
      }),
    ),
  };

  const todayScoreInput: LifeScoreInput = {
    hasCompletedProfile: true,
    heightCm: profileRow.heightCm,
    weightKg: profileRow.weightKg,
    goalsCount: goalsToday.total,
    habits: habitsToday,
    tasks: tasksToday,
    workouts: workoutsToday,
    nutrition: nutritionToday,
    appearance: appearanceToday,
  };

  const metrics: CoachMetrics = {
    lifeScore: calculateLifeScore(todayScoreInput),
    habitsDue,
    habitsDone,
    habitsRemaining: Math.max(0, habitsDue - habitsDone),
    habitAdherence: ratio(habitsToday.done, habitsToday.expected),
    tasksOpen: tasksToday.open,
    tasksOverdue: tasksToday.overdue,
    tasksDueToday: taskFacts.filter((task) => task.isDueToday).length,
    tasksCompletedToday,
    tasksCompletedWeek: tasksToday.completed,
    goalsActive: goalsToday.active,
    goalsCompleted: goalsToday.total - goalsToday.active,
    workoutsPlannedToday,
    workoutsDoneToday,
    workoutsRemaining: Math.max(0, workoutsPlannedToday - workoutsDoneToday),
    workoutAdherence: ratio(workoutsToday.done, workoutsToday.expected),
    workoutsWeek: workoutsToday.done,
    workoutVolumeWeek: Math.round(workoutVolumeWeek),
    nutritionAdherence: ratio(nutritionToday.daysLogged, nutritionToday.expected),
    nutritionDaysWeek: nutritionToday.daysLogged,
    appearanceDueToday: appearanceFact.dueToday,
    appearanceDoneToday: appearanceFact.doneToday,
    appearanceRemaining: careRemaining.length,
    appearanceAdherence: ratio(appearanceToday.done, appearanceToday.expected),
  };

  // The account's own first day has no yesterday to compare against, and
  // inventing a row of zeros would read as "everything collapsed overnight".
  const existedYesterday =
    diffDays(dayInZone(user.createdAt, timezone), yesterday) >= 0;

  const previous: CoachMetrics | null = existedYesterday
    ? {
        lifeScore: calculateLifeScore({
          hasCompletedProfile: true,
          // No history for these two — yesterday is scored on today's body,
          // which keeps the wellness block steady rather than pretending to a
          // measurement that was never taken.
          heightCm: profileRow.heightCm,
          weightKg: profileRow.weightKg,
          goalsCount: goalsYesterday.total,
          habits: habitsYesterday,
          tasks: tasksYesterday,
          workouts: workoutsYesterday,
          nutrition: nutritionYesterday,
          appearance: appearanceYesterday,
        }),
        habitsDue: 0,
        habitsDone: 0,
        habitsRemaining: 0,
        habitAdherence: ratio(habitsYesterday.done, habitsYesterday.expected),
        tasksOpen: tasksYesterday.open,
        tasksOverdue: tasksYesterday.overdue,
        tasksDueToday: 0,
        tasksCompletedToday: 0,
        tasksCompletedWeek: tasksYesterday.completed,
        goalsActive: goalsYesterday.active,
        goalsCompleted: goalsYesterday.total - goalsYesterday.active,
        // Same shape as the habit fields above: "planned today" and "done
        // today" are statements about *today* and have no yesterday reading
        // that could be reconstructed honestly, so they stay at zero and the
        // report never builds a row out of them.
        workoutsPlannedToday: 0,
        workoutsDoneToday: 0,
        workoutsRemaining: 0,
        workoutAdherence: ratio(workoutsYesterday.done, workoutsYesterday.expected),
        workoutsWeek: workoutsYesterday.done,
        workoutVolumeWeek: 0,
        nutritionAdherence: ratio(nutritionYesterday.daysLogged, nutritionYesterday.expected),
        nutritionDaysWeek: nutritionYesterday.daysLogged,
        // Same shape as the habit and workout fields above: "due today" and
        // "done today" are statements about *today* with no yesterday reading
        // that could be reconstructed honestly, so they stay at zero and the
        // report never builds a row out of them.
        appearanceDueToday: 0,
        appearanceDoneToday: 0,
        appearanceRemaining: 0,
        appearanceAdherence: ratio(appearanceYesterday.done, appearanceYesterday.expected),
      }
    : null;

  // Newest first, and only finished sessions — an open one is not history yet,
  // the same rule the statistics and the Life Score already apply.
  const completedSessions = sessions
    .filter((session) => session.completedAt !== null)
    .sort((a, b) => b.day.localeCompare(a.day));

  const recentSessions: CoachSessionFact[] = completedSessions
    .slice(0, RECENT_SESSION_COUNT)
    .map((session) => {
      const stats = sessionStats(session, workoutById.get(session.workoutId));
      return {
        day: session.day,
        title: workoutById.get(session.workoutId)?.title ?? "Тренировка",
        volumeKg: Math.round(stats.volumeKg),
        setsCount: stats.setsDone,
      };
    });

  const trends: CoachTrends = {
    habitAdherencePercent: {
      current: Math.round(ratio(habitsToday.done, habitsToday.expected) * 100),
      previous: Math.round(ratio(habitsPrevWeek.done, habitsPrevWeek.expected) * 100),
    },
    workoutsDone: { current: workoutsToday.done, previous: workoutsPrevWeek.done },
    tasksCompleted: { current: tasksToday.completed, previous: tasksPrevWeek.completed },
    nutritionDaysLogged: {
      current: nutritionToday.daysLogged,
      previous: nutritionPrevWeek.daysLogged,
    },
    sleepAverageMin: { current: sleepFact.average7dMin, previous: sleepFact.averagePrev7dMin },
  };

  const localHour = hourIn(timezone);

  const clock: CoachClockFacts = {
    weekdayName: WEEKDAY_NAMES[weekdayIndex(today)],
    dateLabel: formatDay(today, today),
    isWeekend: weekdayIndex(today) >= 5,
    localHour,
    partOfDay: partOfDay(localHour),
    daysWithNova: Math.max(0, diffDays(dayInZone(user.createdAt, timezone), today)),
  };

  return {
    today,
    clock,
    profile: {
      firstName: profileRow.name.split(" ")[0] || user.firstName,
      age: profileRow.age,
      heightCm: profileRow.heightCm,
      weightKg: profileRow.weightKg,
      bmi: bmiOf(profileRow.heightCm, profileRow.weightKg),
      bmiLabel: bmiLabel(bmiOf(profileRow.heightCm, profileRow.weightKg)),
      gender: profileRow.gender as GenderValue,
      primaryGoal: profileRow.primaryGoal as PrimaryGoalValue,
      occupation: profileRow.occupation as OccupationValue,
      timezone,
      localHour,
    },
    metrics,
    yesterday: previous,
    trends,
    habits: habitFacts,
    tasks: taskFacts,
    goals: goalFacts,
    workouts: workoutFacts,
    recentSessions,
    daysSinceLastWorkout:
      completedSessions.length === 0 ? null : diffDays(completedSessions[0].day, today),
    nutrition: nutritionFact,
    appearance: appearanceFact,
    sleep: sleepFact,
    potential: computePotential(
      todayScoreInput,
      metrics.habitsRemaining,
      metrics.tasksOverdue,
      metrics.workoutsRemaining,
      nutritionFact.hasGoal && !nutritionFact.isLoggedToday,
      careRemaining.length,
    ),
  };
}

function ratio(done: number, expected: number): number {
  return expected === 0 ? 0 : Math.min(1, done / expected);
}

/** Whether an ISO completion instant fell on `day` in the user's own zone. */
function completedOn(iso: string, day: CalendarDay, timezone: string): boolean {
  return dayInZone(new Date(iso), timezone) === day;
}

// ---------------------------------------------------------------------------
// Derivations that only the Coach needs
// ---------------------------------------------------------------------------

/**
 * Full weekday names, Monday-first — the same order weekdayIndex and the
 * weekday bitmask use. WEEKDAY_SHORT is the two-letter form the calendars
 * render; a sentence needs the whole word.
 */
const WEEKDAY_NAMES = [
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
  "воскресенье",
] as const;

/**
 * The hour, as a person would say it.
 *
 * Cut where Russian actually cuts: утро starts at five, not at midnight, and
 * a message at two in the morning should know it is ночь. The Coach uses this
 * to decide whether "сегодня" still has a day left in it.
 */
function partOfDay(hour: number): string {
  if (hour < 5) return "ночь";
  if (hour < 12) return "утро";
  if (hour < 18) return "день";
  if (hour < 23) return "вечер";
  return "ночь";
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function daysOf(from: CalendarDay, to: CalendarDay): CalendarDay[] {
  const span = diffDays(from, to);
  return span < 0 ? [] : Array.from({ length: span + 1 }, (_, index) => addDays(from, index));
}

/**
 * Calories per day, over the days in range that actually have entries.
 *
 * Days with nothing logged are left out rather than counted as zero: a missed
 * day is a gap in the diary, not a day of fasting, and averaging zeros in
 * would let "не записал" masquerade as "почти ничего не ел".
 */
function dailyCalories(
  entries: NutritionEntryItem[],
  from: CalendarDay,
  to: CalendarDay,
): number[] {
  return daysOf(from, to)
    .map((day) => entriesOnDay(entries, day))
    .filter((dayEntries) => dayEntries.length > 0)
    .map((dayEntries) => Math.round(sumMacros(dayEntries).calories));
}

/** Protein per day, over the same logged-days-only rule as dailyCalories. */
function dailyProtein(
  entries: NutritionEntryItem[],
  from: CalendarDay,
  to: CalendarDay,
): number[] {
  return daysOf(from, to)
    .map((day) => entriesOnDay(entries, day))
    .filter((dayEntries) => dayEntries.length > 0)
    .map((dayEntries) => Math.round(sumMacros(dayEntries).proteinG));
}

/**
 * Today's diary, one line per meal that has something in it.
 *
 * Names and amounts, because that is the level a coach can say something
 * useful at ("ужин — только творог") and a calorie total cannot. Capped per
 * meal so a day of fifteen snacks stays a line rather than a paragraph.
 */
function mealLines(dayEntries: NutritionEntryItem[]): CoachMealLine[] {
  return MEAL_SLOTS.map((slot) => {
    const items = dayEntries.filter((entry) => entry.mealSlot === slot);
    if (items.length === 0) return null;

    const named = items
      .slice(0, MEAL_ITEM_CAP)
      .map((entry) => `${entry.food.name} ${Math.round(entry.amountG)} г`)
      .join(", ");
    const rest = items.length - MEAL_ITEM_CAP;

    return {
      slot: MEAL_SLOT_LABELS[slot],
      text: rest > 0 ? `${named} и ещё ${rest}` : named,
      calories: Math.round(
        items.reduce((total, entry) => total + entryMacros(entry).calories, 0),
      ),
    };
  }).filter((line): line is CoachMealLine => line !== null);
}

/** The logged nights inside a range, oldest first. */
function nightsBetween(
  logs: SleepLogItem[],
  from: CalendarDay,
  to: CalendarDay,
): SleepLogItem[] {
  return logs
    .filter((log) => diffDays(from, log.day) >= 0 && diffDays(log.day, to) >= 0)
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * "23:40" as minutes on a scale where the evening comes *before* midnight.
 *
 * Anything past 18:00 is mapped to a negative number, so a 23:40 and a 00:20
 * bedtime are forty minutes apart rather than twenty-three hours. Without this
 * the spread of a perfectly regular sleeper who occasionally crosses midnight
 * would be the largest number in the section.
 */
function bedTimeMinutes(bedTime: string): number {
  const [hours, minutes] = bedTime.split(":").map(Number);
  const total = (hours || 0) * 60 + (minutes || 0);
  return total >= 18 * 60 ? total - 24 * 60 : total;
}
