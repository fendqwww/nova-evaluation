"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { getSettings } from "@/features/settings/server/settings.repository";
import { hasAiConsent } from "@/features/legal/server";
import { consumeCoachMessage, refundCoachMessage } from "@/features/usage/server";
import { buildWorkoutProgram, isProgramModelEnabled } from "@/ai/workout-program";
import { createWorkout } from "@/features/workouts/server/workouts.repository";
import { buildTemplateProgram } from "@/features/workouts/lib/program-builder";
import {
  PROGRAM_EQUIPMENT,
  PROGRAM_GOALS,
  PROGRAM_LEVELS,
  type ProgramPlan,
} from "@/features/workouts/lib/program-plan";
import { ACTIVITY_LABELS, type ActivityLevel } from "@/features/nutrition/lib/targets";

const inputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  goal: z.enum(PROGRAM_GOALS),
  level: z.enum(PROGRAM_LEVELS),
  equipment: z.enum(PROGRAM_EQUIPMENT),
  limitations: z
    .string()
    .trim()
    .max(300, "Слишком длинное описание")
    .transform((value) => (value === "" ? null : value))
    .nullable(),
});

export type GenerateProgramInput = z.input<typeof inputSchema>;

export type GenerateProgramResult =
  | { ok: true; created: number; source: "model" | "template"; name: string }
  | { ok: false; message: string };

/**
 * «Не знаешь, какую программу выбрать?» — три вопроса и готовая программа.
 *
 * ЧТО ЭТО СОЗДАЁТ. Не новую сущность, а обычные Workout — по одному на
 * тренировочный день, каждый со своим днём недели. Дальше они живут как любые
 * другие программы: их правят, архивируют и выполняют теми же экранами. Это
 * важнее, чем кажется: подбор, создающий особые «сгенерированные» программы,
 * которые нельзя редактировать, был бы отдельной подсистемой внутри раздела.
 *
 * КАК И ВЕЗДЕ: программа создаётся всегда. Модель улучшает черновик, собранный
 * determined-логикой (program-builder.ts), а при её недоступности записывается
 * сам черновик. Единица лимита резервируется атомарно до вызова и возвращается,
 * если модель ничего не дала. Расход идёт из бюджета коуча — новый счётчик
 * означал бы колонку в UserUsage и правку логики лимитов ради кнопки, которую
 * нажимают раз в несколько месяцев.
 *
 * СУЩЕСТВУЮЩИЕ ПРОГРАММЫ НЕ ТРОГАЮТСЯ. Ни архивации, ни удаления: человек, у
 * которого уже есть свой план, получает рядом ещё один и сам решает, что с ним
 * делать. Молча архивировать чужую работу — не то, что должна делать кнопка
 * «подобрать программу».
 */
export async function generateProgramAction(
  input: GenerateProgramInput,
): Promise<GenerateProgramResult> {
  const { rawInitData, goal, level, equipment, limitations } = inputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  const draft = buildTemplateProgram({ goal, level, equipment });

  const settings = await getSettings(userId);
  const canAskModel =
    isProgramModelEnabled() && settings.ai.coachEnabled && (await hasAiConsent(userId));

  let plan: ProgramPlan = draft;
  let source: "model" | "template" = "template";

  if (canAskModel) {
    const usage = { userId, plan: settings.plan, today: todayIn(timezone) };
    const permission = await consumeCoachMessage(usage);

    if (permission.success) {
      const profile = await db.profile.findUnique({
        where: { userId },
        select: { age: true, heightCm: true, weightKg: true, gender: true, activityLevel: true },
      });

      const fromModel = await buildWorkoutProgram({
        goal,
        level,
        equipment,
        limitations,
        facts:
          profile === null
            ? []
            : [
                `Возраст ${profile.age} лет, рост ${profile.heightCm} см, вес ${profile.weightKg} кг.`,
                `Пол: ${profile.gender === "female" ? "женский" : profile.gender === "male" ? "мужской" : "не указан"}.`,
                `Активность: ${
                  profile.activityLevel === null
                    ? "не указана"
                    : ACTIVITY_LABELS[profile.activityLevel as ActivityLevel]
                }.`,
              ],
        draft,
      });

      if (fromModel) {
        plan = fromModel;
        source = "model";
      } else {
        await refundCoachMessage(usage);
      }
    }
  }

  // Каждый день программы — отдельная запись со своим расписанием. Создаются
  // последовательно, а не в транзакции: частично созданная программа остаётся
  // рабочей (несколько тренировок в плане), тогда как откат уничтожил бы и то,
  // что уже удалось записать.
  for (const day of plan.days) {
    await createWorkout(userId, {
      title: day.title,
      note: plan.summary,
      category: day.category,
      // Бит 0 = понедельник — та же конвенция, что у привычек и у Workout.
      weekdayMask: 1 << day.weekday,
      exercises: day.exercises.map((exercise) => ({
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        // Вес не подставляется намеренно — см. заголовок program-builder.ts.
        targetWeightKg: null,
        restSeconds: exercise.restSeconds,
        note: exercise.note,
      })),
    });
  }

  return { ok: true, created: plan.days.length, source, name: plan.name };
}
