import "server-only";
import { db } from "@/server/db";
import {
  activatePlan,
  deactivatePlan,
  findPlanTarget,
  type AdminPlanTarget,
} from "@/features/settings/server/subscription.repository";
import type { PlanId } from "@/features/settings/types";
import type { GrantablePlan } from "../lib/callback";
import { planGrantedForUser, planRevokedForUser } from "../lib/format";
import { logInfo, logWarn } from "../lib/log";
import { sendMessage } from "./telegram-api";

/**
 * Выдача тарифа из бота поддержки.
 *
 * Это не второй механизм выдачи, а второй *вызывающий* уже существующего:
 * activatePlan остаётся единственным местом, где пишутся колонки тарифа, и
 * продление, перенос остатка дней и сохранение даты начала работают здесь ровно
 * так же, как в HTTP-эндпоинте. Разница только в том, кто нажимает.
 *
 * Зачем это понадобилось: выдать тариф можно было исключительно через
 * `curl -X POST .../api/admin/activate-plan` с секретом в заголовке. Человек,
 * который в боте видит «хочу оплатить PLUS», должен был открыть терминал, найти
 * ADMIN_SECRET и вручную собрать запрос — то есть в реальности не выдавал
 * ничего. Эндпоинт остаётся (он нужен скриптам и будущему платёжному вебхуку),
 * но теперь у него есть человеческий интерфейс.
 *
 * Уведомление пользователя — часть операции, а не отдельная любезность. Тариф,
 * о котором человек не знает, для него не существует: он продолжает видеть
 * старые лимиты, потому что не додумался перезапустить приложение.
 */

export interface PlanGrantResult {
  target: AdminPlanTarget;
  plan: PlanId;
  until: string | null;
  /** Дошло ли до пользователя сообщение. */
  notified: boolean;
}

/**
 * Найти аккаунт по тому, как его назвали.
 *
 * Отдельная функция, потому что вызывается и до выдачи (проверить, что такой
 * есть), и в /plan без аргументов (просто показать текущий тариф).
 */
export async function findTarget(handle: string): Promise<AdminPlanTarget | null> {
  return findPlanTarget(handle);
}

/** Текущий тариф аккаунта — для /plan без указания тарифа. */
export async function readPlan(
  userId: string,
): Promise<{ plan: string; until: Date | null }> {
  const settings = await db.userSettings.findUnique({
    where: { userId },
    select: { plan: true, planUntil: true },
  });

  // Нет строки настроек — значит человек ещё не доходил до экранов, где она
  // создаётся. Тариф у него при этом ровно тот, что по умолчанию.
  return { plan: settings?.plan ?? "free", until: settings?.planUntil ?? null };
}

/**
 * Выдать тариф и сказать об этом пользователю.
 *
 * `days` в 0 или null означает бессрочно — так выдаются компенсации и доступы
 * команде.
 */
export async function grantPlan(
  target: AdminPlanTarget,
  plan: GrantablePlan,
  days: number | null,
  grantedBy: string,
): Promise<PlanGrantResult> {
  const grant = await activatePlan(target.userId, plan, days, "manual");

  logInfo("plan_granted", {
    telegramId: target.telegramId,
    plan,
    days: days ?? "never",
    by: grantedBy,
  });

  const notified = await notifyUser(target, planGrantedForUser(plan, grant.until));

  return { target, plan, until: grant.until, notified };
}

/** Снять тариф — возврат, ошибка или окончание компенсации. */
export async function revokePlan(
  target: AdminPlanTarget,
  revokedBy: string,
): Promise<void> {
  await deactivatePlan(target.userId);

  logInfo("plan_revoked", { telegramId: target.telegramId, by: revokedBy });

  await notifyUser(target, planRevokedForUser());
}

/**
 * Написать пользователю в бот поддержки.
 *
 * Возвращает false вместо исключения, если не дошло. Причина почти всегда одна
 * и она не ошибка: Telegram запрещает боту писать первым, а человек мог
 * получить тариф, ни разу не открыв этого бота — например, попросив в личке.
 * Тариф при этом выдан и работает, и операцию нельзя откатывать из-за того, что
 * не удалось о ней сообщить. Админ увидит, что уведомление не ушло, и скажет
 * сам.
 */
async function notifyUser(target: AdminPlanTarget, text: string): Promise<boolean> {
  // sendMessage возвращает null вместо исключения — Telegram отвечает
  // «403 bot was blocked» обычным ответом, а не сетевой ошибкой.
  const sent = await sendMessage(target.telegramId, text);
  if (sent) return true;

  logWarn("plan_notify_failed", { telegramId: target.telegramId });
  return false;
}
