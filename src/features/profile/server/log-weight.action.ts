"use server";

import { z } from "zod";
import { requireUserContext } from "@/server/auth/current-user";
import { todayIn } from "@/shared/lib/calendar-day";
import { logWeight } from "@/features/profile/server/weight.repository";

/**
 * Границы те же, что у онбординга (onboardingProfileSchema): один и тот же факт
 * не может иметь два разных диапазона допустимого в двух местах приложения.
 */
const inputSchema = z.object({
  rawInitData: z.string().min(1).optional(),
  weightKg: z.coerce.number().min(20, "Минимум 20 кг").max(300, "Максимум 300 кг"),
});

export type LogWeightInput = z.input<typeof inputSchema>;

/**
 * Записать вес за сегодня.
 *
 * День берётся из таймзоны профиля, а не от клиента: телефон с неверной датой не
 * должен уметь задним числом переписать историю веса — то же правило, по которому
 * считается «сегодня» во всём приложении.
 */
export async function logWeightAction(input: LogWeightInput) {
  const { rawInitData, weightKg } = inputSchema.parse(input);
  const { userId, timezone } = await requireUserContext(rawInitData);

  await logWeight(userId, todayIn(timezone), weightKg);

  return { success: true } as const;
}
