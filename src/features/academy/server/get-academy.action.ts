"use server";

import { requireUserId } from "@/server/auth/current-user";
import { listCompletedLessonIds } from "@/features/academy/server/academy.repository";

/**
 * Прогресс Академии — единственное, что нужно запрашивать.
 *
 * Сами уроки не едут по проводу: они лежат в клиентском бандле
 * (content/lessons.ts), потому что одинаковы для всех и не меняются между
 * запросами. Отправлять двадцать текстов вместе с каждым открытием экрана
 * означало бы платить трафиком за данные, которые уже загружены.
 */
export async function getAcademy(rawInitData: string | undefined): Promise<string[]> {
  const userId = await requireUserId(rawInitData);
  return listCompletedLessonIds(userId);
}
