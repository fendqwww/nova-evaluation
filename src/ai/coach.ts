import "server-only";
import { generateStructured, isGeminiEnabled, GeminiError } from "@/ai/gemini";
import { COACH_PROMPT, COACH_ASK_TASK, COACH_BRIEF_TASK } from "@/ai/prompts";
import {
  COACH_ANSWER_JSON_SCHEMA,
  COACH_MEMORY_PER_TURN,
  coachAnswerSchema,
  coachMemoryListSchema,
  coachMemorySchema,
} from "@/features/coach/schemas";
import { topObservations } from "@/features/coach/lib/observations";
import type {
  CoachAnalysis,
  CoachAnswer,
  CoachMemoryItem,
  CoachMessageItem,
} from "@/features/coach/types";
import type { CoachMemoryWrite } from "@/features/coach/server/coach-memory.repository";

/**
 * Gemini as the analyst, never as the source.
 *
 * The division of labour: buildCoachAnalysis measures, this module reasons,
 * and the zod schema on the way back guarantees that what comes out fits the
 * same card the deterministic composer fills. Every number in the prompt is
 * one the app already computed, and the prompt says in as many words that the
 * model may not introduce another.
 *
 * What changed here — and it is the whole point of the rewrite — is how much
 * the model gets and what it is asked to do with it. Before, it received a
 * trimmed digest and a finished deterministic answer, with instructions
 * amounting to "say this again, better": a paraphrase was the best possible
 * outcome. Now it receives the day in full — the clock, the week against the
 * week before it, what was actually eaten today, the last seven nights with
 * bedtimes, the last sessions, what the Coach remembers about this person from
 * previous conversations — plus a ranked list of what changed (see
 * lib/observations.ts), and the draft is explicitly a floor to beat.
 *
 * Neither entry point ever throws. No API key, a timeout, a rate limit, a
 * response that fails validation — every one of them returns null, and the
 * caller ships the composer's draft instead. The feature is fully functional
 * either way; the model is an upgrade to the thinking, not a dependency. This
 * is also why the Coach is the one AI surface that never shows the user an
 * "upgrade required" error for hitting the usage limit: it has somewhere honest
 * to fall back to, and food/appearance analysis do not.
 *
 * Usage is not counted here. The caller reserves a unit through
 * features/usage before calling in, and gives it back when this returns null —
 * so a turn that produced nothing but a fallback draft costs the user nothing.
 */

/** How many earlier turns travel with the question. */
const HISTORY_TURNS = 8;

/** How many ranked observations travel with any prompt. */
const SIGNAL_COUNT = 8;

/**
 * Warmer than the vision features' 0.4.
 *
 * Those read a photo and want the single most likely answer; this one writes
 * to a person it has been talking to for weeks, and at 0.4 it produces the
 * same three sentence-shapes every day, which is precisely what "звучит как
 * ChatGPT" means in practice. The facts do not drift with temperature — they
 * are all in the prompt and all validated coming back — only the prose does.
 */
const COACH_TEMPERATURE = 0.65;

/** Four sentences, five bullets and three actions need more room than 2048. */
const COACH_MAX_TOKENS = 3072;

export function isCoachModelEnabled(): boolean {
  return isGeminiEnabled();
}

/**
 * An answer, plus whatever the conversation taught the Coach about the user.
 *
 * The two travel together because they are produced by the same call, and are
 * separated immediately by the caller: the answer goes to the card and the
 * chat history, the memory goes to CoachMemory. Nothing downstream of the
 * card ever sees the memory field.
 */
export interface CoachModelResult {
  answer: CoachAnswer;
  memory: CoachMemoryWrite[];
}

export interface CoachModelRequest {
  analysis: CoachAnalysis;
  /** The deterministic answer — a floor to beat, not a text to polish. */
  draft: CoachAnswer;
  /** Prior turns of this conversation, oldest first. */
  history: CoachMessageItem[];
  /** What the Coach already knows about this person. */
  memories: CoachMemoryItem[];
}

/**
 * A better answer to `question` than `draft`, or null.
 *
 * Null is a completely ordinary outcome — no key configured, the network is
 * down, the model took too long, the JSON did not validate. Every one of them
 * means the caller ships the draft it already has, so there is no error path
 * for the user to see and nothing to retry — and the caller refunds the unit it
 * reserved, because nothing was produced.
 */
export async function askCoachModel(
  question: string,
  request: CoachModelRequest,
): Promise<CoachModelResult | null> {
  return runCoachModel(request, COACH_ASK_TASK, `<question>${question}</question>`);
}

/**
 * The proactive daily briefing — the Coach opening the conversation.
 *
 * Same context, same contract, no question. Called once per local day and
 * cached (see features/coach/server/coach-brief.repository.ts), because a
 * greeting regenerated on every screen open would spend a unit of budget to
 * tell the user something they read an hour ago.
 */
export async function generateCoachBrief(
  request: CoachModelRequest,
): Promise<CoachModelResult | null> {
  return runCoachModel(request, COACH_BRIEF_TASK, null);
}

// ---------------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------------

async function runCoachModel(
  request: CoachModelRequest,
  task: string,
  questionBlock: string | null,
): Promise<CoachModelResult | null> {
  if (!isGeminiEnabled()) return null;

  const priorTurns = request.history.slice(-HISTORY_TURNS).map((message) => ({
    role: message.role === "user" ? ("user" as const) : ("model" as const),
    text: message.text,
  }));

  const prompt = [
    task,
    `<user_data>${factsFor(request.analysis)}</user_data>`,
    `<signals>${signalsFor(request.analysis)}</signals>`,
    `<memory>${memoryFor(request.memories)}</memory>`,
    `<draft>${JSON.stringify(request.draft)}</draft>`,
    questionBlock,
  ]
    .filter((block): block is string => block !== null)
    .join("\n\n");

  try {
    const raw = await generateStructured({
      systemInstruction: COACH_PROMPT,
      prompt,
      history: priorTurns,
      jsonSchema: COACH_ANSWER_JSON_SCHEMA,
      temperature: COACH_TEMPERATURE,
      maxOutputTokens: COACH_MAX_TOKENS,
    });

    // The answer decides whether the call succeeded; the memory never does.
    // coachAnswerSchema strips the memory field on its way through, which is
    // exactly what should reach a card and a stored payload.
    const answer = coachAnswerSchema.safeParse(raw);
    if (!answer.success) return null;

    return { answer: answer.data, memory: parseMemory(raw) };
  } catch (error) {
    if (!(error instanceof GeminiError)) {
      console.error("[ai/coach] unexpected failure", error);
    }
    return null;
  }
}

/**
 * The facts a response asked to remember, keeping the valid ones.
 *
 * Per item rather than all-or-nothing: one entry with a bad key or an empty
 * value must not cost the other two, and it must certainly not cost the
 * answer. Anything that fails is dropped silently — the user asked a question,
 * not for a report on the model's bookkeeping.
 */
function parseMemory(raw: unknown): CoachMemoryWrite[] {
  const container =
    typeof raw === "object" && raw !== null ? (raw as { memory?: unknown }) : {};
  const entries = coachMemoryListSchema.parse(container.memory ?? []);

  return entries
    .map((entry) => coachMemorySchema.safeParse(entry))
    .filter((result) => result.success)
    .map((result) => result.data)
    .slice(0, COACH_MEMORY_PER_TURN);
}

// ---------------------------------------------------------------------------
// The prompt's data blocks
// ---------------------------------------------------------------------------

/**
 * What already changed, ranked, as plain lines.
 *
 * The model gets the raw numbers too, but forty of them with no ordering is a
 * haystack: handed only user_data it will reliably lead with whichever section
 * happens to look worst rather than with what actually moved. These are the
 * same observations the deterministic brief leads with, so the two producers
 * cannot disagree about what today's story is — only about how well it is
 * told.
 */
function signalsFor(analysis: CoachAnalysis): string {
  const signals = topObservations(analysis, SIGNAL_COUNT);
  if (signals.length === 0) return "Заметных изменений за последние дни нет.";

  return signals.map((signal) => `- [${signal.tone}] ${signal.text}`).join("\n");
}

/** Long-term memory as lines, newest first. Empty is a normal state. */
function memoryFor(memories: CoachMemoryItem[]): string {
  if (memories.length === 0) return "Пока ничего не известно о предпочтениях этого человека.";

  return memories.map((item) => `- (${item.kind}) ${item.value}`).join("\n");
}

/**
 * The analysis, flattened to the shape a prompt can read.
 *
 * Trimmed where trimming is free and not where it is not: ids the model can
 * neither use nor verify are dropped and the long lists are capped, but every
 * section the user actually keeps is represented, because a Coach that cannot
 * see what was eaten today cannot say anything better than "следи за
 * питанием".
 *
 * Keys are Russian for the same reason the answers are: the model is
 * reasoning and writing in one language, and a payload that switches to
 * English field names for the facts makes the two halves of that job
 * needlessly different.
 */
function factsFor(analysis: CoachAnalysis): string {
  const { profile, clock, metrics, potential, trends, yesterday } = analysis;

  return JSON.stringify(
    {
      сейчас: {
        дата: clock.dateLabel,
        день_недели: clock.weekdayName,
        выходной: clock.isWeekend,
        местный_час: clock.localHour,
        время_суток: clock.partOfDay,
        дней_в_nova: clock.daysWithNova,
      },
      профиль: {
        имя: profile.firstName,
        возраст: profile.age,
        пол: profile.gender,
        рост_см: profile.heightCm,
        вес_кг: profile.weightKg,
        имт: profile.bmi,
        имт_оценка: profile.bmiLabel,
        основная_цель: profile.primaryGoal,
        род_деятельности: profile.occupation,
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
      // Неделя против предыдущей — единственный блок, по которому можно
      // говорить о направлении, а не о положении.
      динамика_неделя_к_неделе: {
        дисциплина_привычек_процент: trends.habitAdherencePercent,
        тренировок: trends.workoutsDone,
        закрыто_задач: trends.tasksCompleted,
        дней_с_дневником_питания: trends.nutritionDaysLogged,
        средний_сон_минут: trends.sleepAverageMin,
      },
      сон: {
        есть_записи: analysis.sleep.hasLogs,
        цель_минут: analysis.sleep.goalMin,
        прошлой_ночью_минут: analysis.sleep.lastNightMin,
        прошлой_ночью_качество_из_5: analysis.sleep.lastNightQuality,
        прошлой_ночью_отбой: analysis.sleep.lastNightBedTime,
        прошлой_ночью_подъём: analysis.sleep.lastNightWakeTime,
        среднее_за_7_дней_минут: analysis.sleep.average7dMin,
        среднее_за_предыдущие_7_дней_минут: analysis.sleep.averagePrev7dMin,
        среднее_качество_из_5: analysis.sleep.averageQuality,
        ночей_записано_за_неделю: analysis.sleep.daysLoggedWeek,
        ночей_с_нормой_за_неделю: analysis.sleep.nightsOnTargetWeek,
        недобор_за_неделю_минут: analysis.sleep.debtWeekMin,
        // null при одной ночи: у одного отбоя нет разброса, и ноль читался бы
        // как идеальный режим вместо «данных не хватает».
        разброс_отбоя_минут: analysis.sleep.bedTimeSpreadMin,
        серия_дней_подряд: analysis.sleep.streak,
        последние_ночи: analysis.sleep.recentNights.map((night) => ({
          день: night.day,
          минут: night.durationMin,
          качество: night.quality,
          отбой: night.bedTime,
          подъём: night.wakeTime,
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
        // Единственное место, где еда названа по имени, а не сведена к сумме
        // калорий: «ужин — только творог» это вывод, «недобор 600 ккал» нет.
        сегодня_приёмы_пищи: analysis.nutrition.todayMeals.map((meal) => ({
          приём: meal.slot,
          состав: meal.text,
          ккал: meal.calories,
        })),
        среднее_за_неделю_ккал: analysis.nutrition.averageCaloriesWeek,
        среднее_за_предыдущую_неделю_ккал: analysis.nutrition.averageCaloriesPrevWeek,
        среднее_белка_за_неделю_г: analysis.nutrition.averageProteinWeekG,
        среднее_воды_за_неделю_мл: analysis.nutrition.averageWaterWeekMl,
        дней_в_цели_за_неделю: analysis.nutrition.daysOnTargetWeek,
        серия_дней_с_записями: analysis.nutrition.loggingStreak,
        дней_с_записями_за_неделю: metrics.nutritionDaysWeek,
        // null, а не 0: без цели нечего выполнять, и процент был бы выдуманным.
        выполнение_за_неделю_процент:
          analysis.nutrition.adherence === null
            ? null
            : Math.round(analysis.nutrition.adherence * 100),
      },
      тренировки: {
        всего: analysis.workouts.length,
        сегодня_по_плану: metrics.workoutsPlannedToday,
        сегодня_выполнено: metrics.workoutsDoneToday,
        сегодня_осталось: metrics.workoutsRemaining,
        за_неделю_выполнено: metrics.workoutsWeek,
        выполнение_плана_процент: Math.round(metrics.workoutAdherence * 100),
        объём_за_неделю_кг: metrics.workoutVolumeWeek,
        дней_с_последней_тренировки: analysis.daysSinceLastWorkout,
        последние_сессии: analysis.recentSessions.map((session) => ({
          день: session.day,
          название: session.title,
          подходов: session.setsCount,
          объём_кг: session.volumeKg,
        })),
        программы: analysis.workouts.slice(0, 10).map((workout) => ({
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
