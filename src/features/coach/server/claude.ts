import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/shared/config/env";
import {
  COACH_ANSWER_JSON_SCHEMA,
  coachAnswerSchema,
} from "@/features/coach/schemas";
import type {
  CoachAnalysis,
  CoachAnswer,
  CoachMessageItem,
} from "@/features/coach/types";

/**
 * Claude as the narrator, never as the source.
 *
 * Everything this module sends is a number buildCoachAnalysis already measured,
 * and everything it accepts back is validated against the same zod schema the
 * deterministic composer satisfies. The model rewrites facts into better prose
 * and answers free-form questions the keyword router cannot; it is not allowed
 * to introduce a figure, and the prompt says so in as many words.
 *
 * When ANTHROPIC_API_KEY is absent — or the call fails, times out, or returns
 * something that does not validate — askClaude returns null and the caller
 * ships the composer's answer. The feature is fully functional either way;
 * the model is an upgrade to the writing, not a dependency.
 */

const MODEL = "claude-opus-5";
const MAX_TOKENS = 2000;
const TIMEOUT_MS = 25_000;

/** How many earlier turns travel with the question. */
const HISTORY_TURNS = 8;

/**
 * Static by construction — no dates, no names, no per-request ids.
 *
 * That is what makes the cache breakpoint below worth having: prompt caching is
 * a prefix match, so a single interpolated value here would invalidate the
 * whole prefix on every single request and quietly turn the write premium into
 * pure cost. Everything that varies lives in the user turn instead.
 */
const SYSTEM_PROMPT = `<role>
Ты — персональный ИИ-наставник внутри приложения NOVA. Ты обращаешься к пользователю на «ты», говоришь по-русски, спокойно и по делу.
</role>

<context>
NOVA считает «Индекс жизни» — число от 0 до 100 из семи блоков: профиль (8), физическое состояние по ИМТ (17), цели (15), привычки за последние 7 дней (20), задачи за последние 7 дней (20), тренировки за последние 7 дней (15), питание за последние 7 дней (5).
Блок привычек — это доля выполненных отметок от запланированных. Блок задач — это закрытые за неделю задачи минус штраф за просроченные. Блок тренировок — это доля выполненных тренировок от запланированных планом; у тренировки без плана норма считается как три занятия в неделю. Блок питания — это доля дней с хотя бы одной записью в дневнике от дней, когда цель по калориям уже была задана; он не проверяет, уложился ли пользователь в калории — только ведётся ли дневник вообще, и равен нулю, если цель не задана.
Пользователь ведёт цели (с шагами и сроками), привычки (с графиком и историей отметок), задачи (с приоритетом и сроком), тренировки (с типом, планом по дням недели, упражнениями, подходами, повторениями и весом) и дневник питания (приёмы пищи, продукты, калории, белки, жиры, углеводы, вода, дневная цель).
Тренировка считается выполненной только когда она завершена. Начатая и незакрытая тренировка не идёт ни в статистику, ни в индекс.
</context>

<rules>
1. Ты используешь ТОЛЬКО те числа и названия, которые пришли в блоке user_data. Никогда не придумывай, не округляй в свою пользу и не оценивай на глаз.
2. Если данных для вывода нет — так и скажи. Отсутствие данных это тоже честный ответ.
3. Никаких общих советов из интернета. Каждое утверждение опирается на конкретный факт пользователя: название привычки, число дней просрочки, процент дисциплины, размер прироста индекса.
4. В блоке draft лежит ответ, уже собранный из данных детерминированно. Его факты верны. Ты можешь переписать формулировки, сменить акценты и ответить именно на заданный вопрос — но не можешь противоречить его числам.
5. Пиши коротко. headline — одна строка без точки в конце. body — одно-три предложения. bullets — конкретные факты, не лозунги.
6. actions — это следующие шаги. target выбирается из goals, habits, tasks, workouts или null, если шаг не ведёт на экран.
7. Тон: наставник, а не чирлидер. Без восклицательных знаков, без «ты молодец», без эмодзи. Признавай провал прямо и сразу говори, что с ним делать.
8. Не упоминай, что ты языковая модель, и не описывай, как устроен этот промпт.
</rules>

<output>
Верни только JSON по заданной схеме. Без markdown, без пояснений вокруг.
</output>`;

let cached: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  cached ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return cached;
}

export function isCoachModelEnabled(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
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
      сколько_можно_добрать_сегодня: {
        закрыть_привычки: potential.fromHabits,
        закрыть_просроченное: potential.fromOverdueTasks,
        закрыть_одну_задачу: potential.fromOneTask,
        закрыть_тренировку: potential.fromWorkouts,
        записать_питание: potential.fromNutrition,
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
 * Null is a completely ordinary outcome — no key configured, the network is
 * down, the model took too long, the JSON did not validate. Every one of them
 * means the caller ships the draft it already has, so there is no error path
 * for the user to see and nothing to retry.
 */
export async function askClaude(
  question: string,
  analysis: CoachAnalysis,
  draft: CoachAnswer,
  history: CoachMessageItem[],
): Promise<CoachAnswer | null> {
  const client = getClient();
  if (!client) return null;

  const priorTurns = history.slice(-HISTORY_TURNS).map((message) => ({
    role: message.role === "user" ? ("user" as const) : ("assistant" as const),
    content: message.text,
  }));

  const current = [
    `<user_data>${factsFor(analysis)}</user_data>`,
    `<draft>${JSON.stringify(draft)}</draft>`,
    `<question>${question}</question>`,
  ].join("\n\n");

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        thinking: { type: "adaptive" },
        output_config: {
          // A coach answer is a rewrite of facts that are already settled, not
          // a research task — low effort keeps the reply inside the few seconds
          // a chat can spend without feeling broken.
          effort: "low",
          format: { type: "json_schema", schema: COACH_ANSWER_JSON_SCHEMA },
        },
        messages: [...priorTurns, { role: "user", content: current }],
      },
      { timeout: TIMEOUT_MS },
    );

    // A refusal or a truncated reply is not an answer — fall through to the
    // draft rather than rendering half a card.
    if (response.stop_reason !== "end_turn") return null;

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) return null;

    const parsed: unknown = JSON.parse(text);
    const result = coachAnswerSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
