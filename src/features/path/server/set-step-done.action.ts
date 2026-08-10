"use server";

import { z } from "zod";
import { requireUserId } from "@/server/auth/current-user";
import { setStepDone } from "@/features/path/server/path.repository";

const inputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  stepId: z.string().min(1),
  isDone: z.boolean(),
});

export type SetPathStepDoneInput = z.input<typeof inputSchema>;

/**
 * Отметить шаг пути.
 *
 * Возвращает { success }, а не бросает на чужом id: репозиторий сообщает 0
 * задетых строк, и это не исключительная ситуация, а ответ «такого шага у тебя
 * нет». Клиент откатывает оптимистичное обновление по нему же.
 */
export async function setPathStepDoneAction(input: SetPathStepDoneInput) {
  const { rawInitData, stepId, isDone } = inputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const success = await setStepDone(userId, stepId, isDone);
  return { success } as const;
}
