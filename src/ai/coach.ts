import "server-only";
import { generateStructured, isGeminiEnabled, GeminiError } from "@/ai/gemini";
import { getAiUsageStatus, recordAiUsage } from "@/ai/limits";
import { COACH_PROMPT } from "@/ai/prompts";
import {
  COACH_ANSWER_JSON_SCHEMA,
  coachAnswerSchema,
} from "@/features/coach/schemas";
import type {
  CoachAnalysis,
  CoachAnswer,
  CoachMessageItem,
} from "@/features/coach/types";
import type { PlanId } from "@/features/settings/types";

/**
 * Gemini as the narrator, never as the source.
 *
 * Everything this module sends is a number buildCoachAnalysis already
 * measured, and everything it accepts back is validated against the same zod
 * schema the deterministic composer satisfies. The model rewrites facts into
 * better prose and answers free-form questions the keyword router cannot; it
 * is not allowed to introduce a figure, and the prompt says so in as many
 * words.
 *
 * askCoachModel never throws. No API key, a spent usage budget, a timeout, a
 * rate limit, a response that fails validation — every one of them returns
 * null, and the caller ships the composer's draft instead. The feature is
 * fully functional either way; the model is an upgrade to the writing, not a
 * dependency. This is also why the Coach is the one AI surface that never
 * shows the user an "upgrade required" error for hitting the usage limit: it
 * has somewhere honest to fall back to, and food/appearance analysis do not
 * (see ai/limits.ts).
 */

/** How many earlier turns travel with the question. */
const HISTORY_TURNS = 8;

export function isCoachModelEnabled(): boolean {
  return isGeminiEnabled();
}

/**
 * The analysis, flattened to the shape a prompt can read.
 *
 * Trimmed on purpose: ids the model can neither use nor verify are dropped,
 * and the lists are capped, because a prompt carrying forty tasks costs real
 * tokens to say the same thing the top eight already say.
 */
function factsFor(analysis: CoachAnalysis): string {
  const { profile, metrics, potential, yesterday } = analysis;

  return JSON.stringify(
    {
      сегодня: analysis.today,
      профиль: {
        имя: profile.firstName,
        возраст: profile.age,
        рост_см: profile.heightCm,
        вес_кг: profile.weightKg,
        имт: profile.bmi,
        имт_оценка: profile.bmiLabel,
        основная_цель: profile.primaryGoal,
        род_деятельности: profile.occupation,
        местный_час: profile.localHour,
      },
      индекс: {
        значение: metrics.lifeScore.score,
        блоки: metrics.lifeScore.breakdown.map((item) => ({
          блок: item.label,
          балл: item.score,
          максимум: item.maxScore,
        })),
        вчера: yesterday?.lifeScore.score ?? null,
      },
      привычки: {
        всего: analysis.habits.length,
        сегодня_нужно: metrics.habitsDue,
        сегодня_сделано: metrics.habitsDone,
        сегодня_осталось: metrics.habitsRemaining,
        дисциплина_за_неделю_процент: Math.round(metrics.habitAdherence * 100),
        список: analysis.habits.slice(0, 10).map((habit) => ({
          название: habit.title,
          график: habit.schedule,
          нужно_сегодня: habit.isDueToday,
          сделано_сегодня: habit.isDoneToday,
          серия: habit.currentStreak,
          единица_серии: habit.streakUnit === "day" ? "дней" : "недель",
          дисциплина_за_месяц_процент: Math.round(habit.adherence * 100),
          на_этой_неделе: `${habit.weekDone}/${habit.weekTarget}`,
        })),
      },
      задачи: {
        открыто: metrics.tasksOpen,
        просрочено: metrics.tasksOverdue,
        на_сегодня: metrics.tasksDueToday,
        закрыто_сегодня: metrics.tasksCompletedToday,
        закрыто_за_неделю: metrics.tasksCompletedWeek,
        список: analysis.tasks.slice(0, 10).map((task) => ({
          название: task.title,
          приоритет: task.priority,
          срок: task.dueDate,
          дней_просрочки: task.daysOverdue,
        })),
      },
      тренировки: {
        всего: analysis.workouts.length,
        сегодня_по_плану: metrics.workoutsPlannedToday,
        сегодня_выполнено: metrics.workoutsDoneToday,
        сегодня_осталось: metrics.workoutsRemaining,
        за_неделю_выполнено: metrics.workoutsWeek,
        выполнение_плана_процент: Math.round(metrics.workoutAdherence * 100),
        объём_за_неделю_кг: metrics.workoutVolumeWeek,
        список: analysis.workouts.slice(0, 10).map((workout) => ({
          название: workout.title,
          тип: workout.category,
          план: workout.plan,
          сегодня_по_плану: workout.isPlannedToday,
          выполнена_сегодня: workout.isDoneToday,
          начата_и_не_завершена: workout.isOpenToday,
          серия: workout.currentStreak,
          единица_серии: workout.streakUnit === "day" ? "дней" : "недель",
          // null, а не 0: у тренировки без плана нечего выполнять, и процент
          // здесь был бы выдуманным числом.
          выполнение_плана_за_месяц_процент:
            workout.adherence === null ? null : Math.round(workout.adherence * 100),
          на_этой_неделе: `${workout.weekDone}/${workout.weekTarget}`,
          последняя: workout.lastDay,
          объём_за_полгода_кг: workout.volumeKg,
        })),
      },
      цели: {
        в_работе: metrics.goalsActive,
        завершено: metrics.goalsCompleted,
        список: analysis.goals
          .filter((goal) => !goal.isCompleted)
          .slice(0, 8)
          .map((goal) => ({
            название: goal.title,
            прогресс_процент: goal.percent,
            осталось_шагов: goal.hasSteps ? goal.remainingSteps : null,
            дней_до_срока: goal.daysLeft,
          })),
      },
      питание: {
        цель_задана: analysis.nutrition.hasGoal,
        цель_калории: analysis.nutrition.caloriesGoal,
        сегодня_калории: Math.round(analysis.nutrition.caloriesToday),
        сегодня_белки_г: Math.round(analysis.nutrition.proteinTodayG),
        сегодня_жиры_г: Math.round(analysis.nutrition.fatTodayG),
        сегодня_углеводы_г: Math.round(analysis.nutrition.carbsTodayG),
        сегодня_вода_мл: analysis.nutrition.waterTodayMl,
        цель_вода_мл: analysis.nutrition.waterGoalMl,
        сегодня_есть_запись: analysis.nutrition.isLoggedToday,
        серия_дней_с_записями: analysis.nutrition.loggingStreak,
        дней_с_записями_за_неделю: metrics.nutritionDaysWeek,
        // null, а не 0: без цели нечего выполнять, и процент был бы выдуманным.
        выполнение_за_неделю_процент:
          analysis.nutrition.adherence === null ? null : Math.round(analysis.nutrition.adherence * 100),
      },
      уход_за_внешностью: {
        процедур_активно: analysis.appearance.activeCount,
        запланировано_сегодня: analysis.appearance.dueToday,
        выполнено_сегодня: analysis.appearance.doneToday,
        осталось_сегодня: metrics.appearanceRemaining,
        следующая_процедура: analysis.appearance.nextTitle,
        серия_дней_без_пропусков: analysis.appearance.streak,
        // null, а не 0: без процедур нечего выполнять, и процент был бы выдуманным.
        выполнение_за_неделю_процент:
          analysis.appearance.adherence === null
            ? null
            : Math.round(analysis.appearance.adherence * 100),
        самая_слабая_зона: analysis.appearance.weakestArea,
        самая_слабая_зона_процент_за_месяц:
          analysis.appearance.weakestAreaAdherence === null
            ? null
            : Math.round(analysis.appearance.weakestAreaAdherence * 100),
        фото_прогресса_всего: analysis.appearance.photosTotal,
        дней_с_последнего_фото: analysis.appearance.daysSinceLastPhoto,
        целей_по_внешности_в_работе: analysis.appearance.goalsActive,
      },
      сколько_можно_добрать_сегодня: {
        закрыть_привычки: potential.fromHabits,
        закрыть_просроченное: potential.fromOverdueTasks,
        закрыть_одну_задачу: potential.fromOneTask,
        закрыть_тренировку: potential.fromWorkouts,
        записать_питание: potential.fromNutrition,
        закрыть_уход: potential.fromAppearance,
        всего: potential.total,
      },
      вчера: yesterday
        ? {
            индекс: yesterday.lifeScore.score,
            дисциплина_процент: Math.round(yesterday.habitAdherence * 100),
            выполнение_плана_тренировок_процент: Math.round(yesterday.workoutAdherence * 100),
            тренировок_за_неделю: yesterday.workoutsWeek,
            закрыто_задач_за_неделю: yesterday.tasksCompletedWeek,
            просрочено: yesterday.tasksOverdue,
            открыто: yesterday.tasksOpen,
            целей_в_работе: yesterday.goalsActive,
          }
        : null,
    },
    null,
    0,
  );
}

/**
 * A better-written version of `draft`, or null.
 *
 * Null is a completely ordinary outcome — no key configured, no usage budget
 * left, the network is down, the model took too long, the JSON did not
 * validate. Every one of them means the caller ships the draft it already
 * has, so there is no error path for the user to see and nothing to retry.
 */
export async function askCoachModel(
  question: string,
  analysis: CoachAnalysis,
  draft: CoachAnswer,
  history: CoachMessageItem[],
  userId: string,
  plan: PlanId,
): Promise<CoachAnswer | null> {
  if (!isGeminiEnabled()) return null;

  // Not allowed means "no budget left" — Coach has a real fallback (the
  // draft), so this degrades silently instead of surfacing an error, unlike
  // the two analysis features that have nothing to fall back to.
  const usage = await getAiUsageStatus(userId, plan);
  if (!usage.allowed) return null;

  const priorTurns = history.slice(-HISTORY_TURNS).map((message) => ({
    role: message.role === "user" ? ("user" as const) : ("model" as const),
    text: message.text,
  }));

  const prompt = [
    `<user_data>${factsFor(analysis)}</user_data>`,
    `<draft>${JSON.stringify(draft)}</draft>`,
    `<question>${question}</question>`,
  ].join("\n\n");

  try {
    const raw = await generateStructured({
      systemInstruction: COACH_PROMPT,
      prompt,
      history: priorTurns,
      jsonSchema: COACH_ANSWER_JSON_SCHEMA,
    });

    const result = coachAnswerSchema.safeParse(raw);
    if (!result.success) return null;

    await recordAiUsage(userId, "coach");
    return result.data;
  } catch (error) {
    if (!(error instanceof GeminiError)) {
      console.error("[ai/coach] unexpected failure", error);
    }
    return null;
  }
}
