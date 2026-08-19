"use server";

import { db } from "@/server/db";
import { resolveIdentity } from "@/server/auth/identity";
import { recordAppVisit } from "@/features/bot/server/subscriber.repository";
import { isAppAdmin } from "@/features/admin/server/admin-guard";

export interface ResolvedProfile {
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  gender: string;
  primaryGoal: string;
  occupation: string;
  timezone: string;
  themeColor: string;
  /**
   * Null for every profile created before the column existed. The nutrition
   * screen treats null as "never asked" and offers to compute a target rather
   * than assuming a level nobody stated.
   */
  activityLevel: string | null;
}

export interface ResolvedSession {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    photoUrl: string | null;
  };
  onboardingCompleted: boolean;
  profile: ResolvedProfile | null;
  /**
   * "light" | "dark" | "system" — the appearance mode, applied before the first
   * screen paints.
   *
   * It travels with the session rather than with the settings snapshot because
   * of *when* it is needed: the session is the one fetch every screen already
   * waits on, and a mode restored later than that would show the app in the
   * wrong palette for a frame on every cold start. The settings screen still
   * owns editing it — this is a read for painting, not a second source of
   * truth.
   *
   * A plain string, validated where it is used (themeModeSchema), the same way
   * themeColor above is.
   */
  themeMode: string;
  /**
   * Показывать ли вход в панель со сводкой по продукту.
   *
   * Это подсказка интерфейсу, а не разрешение: доступ проверяет сервер на
   * каждом запросе (features/admin/server/admin-guard.ts). Спрятанная строка
   * меню — не ограничение доступа, и обращаться с ней как с ограничением
   * значило бы оставить панель открытой всем, кто знает адрес.
   */
  isAdmin: boolean;
}

export async function resolveSession(
  rawInitData: string | undefined,
): Promise<ResolvedSession> {
  const identity = resolveIdentity(rawInitData);

  const user = await db.user.upsert({
    where: { telegramId: identity.telegramId },
    update: {
      firstName: identity.firstName,
      lastName: identity.lastName,
      username: identity.username,
      languageCode: identity.languageCode,
      photoUrl: identity.photoUrl,
    },
    create: {
      telegramId: identity.telegramId,
      firstName: identity.firstName,
      lastName: identity.lastName,
      username: identity.username,
      languageCode: identity.languageCode,
      photoUrl: identity.photoUrl,
    },
    include: { profile: true, settings: { select: { themeMode: true } } },
  });

  // Отметка о входе — основа всех правил про «давно не заходил». Пишется
  // здесь, потому что это единственное место, через которое проходит каждый
  // запуск Mini App, и ошибиться в нём нельзя: пропущенная отметка означает
  // возвратное сообщение человеку, который был в приложении час назад.
  //
  // Await, а не «в фоне»: на serverless незавершённая работа может не
  // выполниться вовсе, контейнер вправе замереть сразу после ответа.
  await recordAppVisit(user.id, identity.telegramId);

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      photoUrl: user.photoUrl,
    },
    onboardingCompleted: user.onboardingCompletedAt !== null,
    isAdmin: isAppAdmin(identity.telegramId),
    // No settings row yet means nothing has been chosen, which is exactly what
    // "system" means. Kept identical to DEFAULT_SETTINGS.themeMode.
    themeMode: user.settings?.themeMode ?? "system",
    profile: user.profile
      ? {
          name: user.profile.name,
          age: user.profile.age,
          heightCm: user.profile.heightCm,
          weightKg: user.profile.weightKg,
          gender: user.profile.gender,
          primaryGoal: user.profile.primaryGoal,
          occupation: user.profile.occupation,
          timezone: user.profile.timezone,
          themeColor: user.profile.themeColor,
          activityLevel: user.profile.activityLevel,
        }
      : null,
  };
}
