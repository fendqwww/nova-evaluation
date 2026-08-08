"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { requireUserId } from "@/server/auth/current-user";
import { AI_CONSENT_ID } from "@/features/legal/constants";
import {
  acceptConsentsInputSchema,
  revokeConsentInputSchema,
} from "@/features/legal/schemas";
import {
  getConsentState,
  recordConsents,
  revokeConsent,
} from "@/features/legal/server/consent.repository";
import type { ConsentState } from "@/features/legal/types-consent";

export type AcceptConsentsInput = z.input<typeof acceptConsentsInputSchema>;
export type RevokeConsentInput = z.input<typeof revokeConsentInputSchema>;

const readInputSchema = z.object({ rawInitData: z.string().min(1).optional() });
export type GetConsentStateInput = z.input<typeof readInputSchema>;

/** Что пользователь подтвердил и что у него просрочено. */
export async function getConsentStateAction(
  input: GetConsentStateInput,
): Promise<ConsentState> {
  const { rawInitData } = readInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);
  return getConsentState(userId);
}

/**
 * Записать отметки и привести настройки AI в соответствие с ними.
 *
 * Второй шаг — не украшение. Три переключателя в UserSettings это то, что
 * реально решает, уйдёт ли запрос в Gemini, и оставить их включёнными после
 * отказа от трансграничной передачи значило бы иметь в базе состояние
 * «согласия нет, но отправка разрешена». Проверка согласия на сервере всё
 * равно не пустит такой запрос, но противоречие в данных — это будущая ошибка
 * и плохой ответ на вопрос проверяющего.
 *
 * Обратное включение делается только вместе с согласием и только здесь: сам
 * переключатель в настройках согласия не выдаёт (см. update-ai.action.ts).
 */
export async function acceptConsentsAction(
  input: AcceptConsentsInput,
): Promise<ConsentState> {
  const { rawInitData, granted } = acceptConsentsInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  const source = (await getConsentState(userId)).consents.some((consent) => consent.acceptedAt)
    ? "reconsent"
    : "onboarding";

  await recordConsents(userId, granted, source);
  await syncAiSettings(userId, granted.includes(AI_CONSENT_ID));

  return getConsentState(userId);
}

/**
 * Отзыв согласия из настроек.
 *
 * Обязательные согласия здесь не отзываются: отзыв согласия на обработку
 * данных о здоровье означает удаление аккаунта, а это разговор с поддержкой и
 * подтверждение личности, а не переключатель, который можно задеть пальцем.
 * Порядок описан в Политике, экран настроек ведёт туда же.
 */
export async function revokeConsentAction(input: RevokeConsentInput): Promise<ConsentState> {
  const { rawInitData, consentId } = revokeConsentInputSchema.parse(input);
  const userId = await requireUserId(rawInitData);

  if (consentId !== AI_CONSENT_ID) {
    throw new Error("CONSENT_REVOKE_REQUIRES_SUPPORT");
  }

  await revokeConsent(userId, consentId);
  await syncAiSettings(userId, false);

  return getConsentState(userId);
}

/**
 * Переключатели AI следуют за согласием.
 *
 * Выключение — принудительное. Включение — нет: согласие возвращает лишь
 * возможность включить, а какие именно функции нужны пользователю, решает он
 * сам в настройках. Единственное исключение — первый акцепт, когда строки
 * настроек ещё нет: она создаётся со значениями по умолчанию, то есть с
 * включённым AI, и это ровно то, чего человек и ждёт, поставив отметку.
 */
async function syncAiSettings(userId: string, allowed: boolean): Promise<void> {
  if (allowed) {
    await db.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return;
  }

  await db.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      aiCoachEnabled: false,
      aiDailyReport: false,
      aiVisionEnabled: false,
    },
    update: {
      aiCoachEnabled: false,
      aiDailyReport: false,
      aiVisionEnabled: false,
    },
  });
}
