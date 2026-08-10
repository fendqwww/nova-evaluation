import "server-only";
import { generateStructured, isGeminiEnabled } from "@/ai/gemini";
import { WORKOUT_PROGRAM_PROMPT, workoutProgramTask } from "@/ai/prompts/workout-program";
import {
  PROGRAM_EQUIPMENT_LABELS,
  PROGRAM_GOAL_LABELS,
  PROGRAM_LEVEL_LABELS,
  PROGRAM_PLAN_JSON_SCHEMA,
  programPlanSchema,
  type ProgramPlan,
} from "@/features/workouts/lib/program-plan";
import type { ProgramRequest } from "@/features/workouts/lib/program-builder";

/**
 * Подбор программы моделью — улучшение поверх собранной программы.
 *
 * Никогда не бросает и возвращает null на любом отказе: вызывающий записывает
 * черновик, который сам является полноценной программой (см.
 * features/workouts/lib/program-builder.ts). Лимиты считает экшен — этот слой
 * знает про модель и не знает про тарифы.
 */
const PROGRAM_TEMPERATURE = 0.55;
const PROGRAM_MAX_TOKENS = 3072;

export function isProgramModelEnabled(): boolean {
  return isGeminiEnabled();
}

export interface ProgramModelRequest extends ProgramRequest {
  /** Ограничения своими словами: «болят колени», «нет времени по средам». */
  limitations: string | null;
  /** Факты о человеке, уже посчитанные приложением. */
  facts: string[];
  draft: ProgramPlan;
}

export async function buildWorkoutProgram(
  request: ProgramModelRequest,
): Promise<ProgramPlan | null> {
  try {
    const raw = await generateStructured({
      systemInstruction: WORKOUT_PROGRAM_PROMPT,
      prompt: workoutProgramTask({
        goalLabel: PROGRAM_GOAL_LABELS[request.goal],
        levelLabel: PROGRAM_LEVEL_LABELS[request.level],
        equipmentLabel: PROGRAM_EQUIPMENT_LABELS[request.equipment],
        limitations: request.limitations,
        facts: request.facts.join("\n"),
        draftJson: JSON.stringify(request.draft),
      }),
      jsonSchema: PROGRAM_PLAN_JSON_SCHEMA,
      temperature: PROGRAM_TEMPERATURE,
      maxOutputTokens: PROGRAM_MAX_TOKENS,
    });

    const parsed = programPlanSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(`[ai/workout-program] failed validation: ${parsed.error.message}`);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error(`[ai/workout-program] generation failed: ${String(error)}`);
    return null;
  }
}
