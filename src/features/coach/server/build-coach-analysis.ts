import "server-only";
import { db } from "@/server/db";
import {
  addDays,
  dayInZone,
  diffDays,
  hourIn,
  todayIn,
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
import { dayProgress, loggingStreak } from "@/features/nutrition/lib/stats";
import { habitStats } from "@/features/habits/lib/stats";
import { scheduleSummary } from "@/features/habits/lib/schedule";
import { workoutStats, sessionStats } from "@/features/workouts/lib/stats";
import { planSummary, hasPlan } from "@/features/workouts/lib/plan";
import { categoryLabel } from "@/features/workouts/lib/categories";
import { goalProgress, daysUntil } from "@/features/goals/lib/format";
import { bmiLabel, bmiOf, computePotential } from "@/features/coach/lib/analyze";
import type {
  CoachAnalysis,
  CoachGoalFact,
  CoachHabitFact,
  CoachMetrics,
  CoachNutritionFact,
  CoachTaskFact,
  CoachWorkoutFact,
} from "@/features/coach/types";
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
export async function buildCoachAnalysis(
  userId: string,
  timezone: string,
): Promise<CoachAnalysis> {
  const today = todayIn(timezone);
  const yesterday = addDays(today, -1);

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user.profile) throw new Error("PROFILE_NOT_FOUND");

  const profileRow = user.profile;
  const windowStart = addDays(today, -(LOG_WINDOW_DAYS - 1));
  const sessionWindowStart = addDays(today, -(SESSION_WINDOW_DAYS - 1));
  // A short window: the Coach only needs today's and yesterday's totals plus
  // the streak, not the full 90-day history listNutrition ships to the screen.
  const nutritionWindowStart = addDays(today, -NUTRITION_SCORING_WINDOW_DAYS);

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
      }
    : null;

  return {
    today,
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
      localHour: hourIn(timezone),
    },
    metrics,
    yesterday: previous,
    habits: habitFacts,
    tasks: taskFacts,
    goals: goalFacts,
    workouts: workoutFacts,
    nutrition: nutritionFact,
    potential: computePotential(
      todayScoreInput,
      metrics.habitsRemaining,
      metrics.tasksOverdue,
      metrics.workoutsRemaining,
      nutritionFact.hasGoal && !nutritionFact.isLoggedToday,
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
