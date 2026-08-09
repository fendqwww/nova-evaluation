import "server-only";
import { db } from "@/server/db";

/**
 * Подписчик основного бота: кто он, можно ли ему писать, когда заходил.
 *
 * Отдельно от UserSettings.notify* намеренно — см. комментарий к модели
 * BotSubscriber. Коротко: там выбор пользователя внутри приложения, здесь
 * факты о канале доставки, и отметка о блокировке не должна затирать его
 * настройки.
 */

/**
 * Отметить, что человек нажал /start.
 *
 * До этого писать ему нельзя: Telegram запрещает ботам обращаться первыми.
 * Строка создаётся здесь и при первом входе в приложение; планировщик её
 * только читает.
 *
 * Возвращает, был ли он уже знаком боту: /start от нового человека и от
 * вернувшегося — разные сообщения.
 */
export async function touchSubscriber(
  telegramId: string,
  chatId: string,
): Promise<{ isReturning: boolean }> {
  const user = await db.user.findUnique({
    where: { telegramId },
    select: { id: true, botSubscriber: { select: { started: true } } },
  });

  // Человек написал боту, не открыв приложение: аккаунта ещё нет, и создавать
  // его здесь нельзя — он появится при первом запуске Mini App, где есть
  // подписанный initData. Приветствие всё равно уйдёт: оно не требует знать,
  // кто это.
  if (!user) return { isReturning: false };

  const isReturning = user.botSubscriber?.started === true;

  await db.botSubscriber.upsert({
    where: { userId: user.id },
    create: { userId: user.id, chatId, started: true },
    // /start после /stop возвращает напоминания — самый очевидный способ, и
    // единственный, который человек станет искать.
    update: { chatId, started: true, unsubscribed: false, blocked: false },
  });

  return { isReturning };
}

/** Человек попросил больше не писать — командой или кнопкой. */
export async function markUnsubscribed(telegramId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { telegramId },
    select: { id: true },
  });
  if (!user) return;

  await db.botSubscriber.updateMany({
    where: { userId: user.id },
    data: { unsubscribed: true },
  });
}

/**
 * Отметить блокировку.
 *
 * Два пути к одному состоянию: обновление my_chat_member от Telegram и ответ
 * 403 при отправке. Второй нужен потому, что событие может не дойти — если
 * вебхук был недоступен в этот момент, единственным сигналом останется отказ
 * при следующей отправке.
 */
export async function markBlocked(userId: string): Promise<void> {
  await db.botSubscriber.updateMany({ where: { userId }, data: { blocked: true } });
}

/** Снять отметку блокировки — человек вернулся к боту. */
export async function markUnblocked(userId: string): Promise<void> {
  await db.botSubscriber.updateMany({ where: { userId }, data: { blocked: false } });
}

/**
 * Записать вход в приложение.
 *
 * Отсюда берётся «сколько дней не заходил» — основа всех возвратных правил.
 * Вызывается из resolveSession, то есть на каждом запуске Mini App.
 *
 * Строка создаётся, даже если человек не нажимал /start: знать, когда он
 * заходил, нужно независимо от того, можно ли ему писать. `started` при этом
 * остаётся false, и планировщик такого не возьмёт.
 */
export async function recordAppVisit(userId: string, telegramId: string): Promise<void> {
  await db.botSubscriber.upsert({
    where: { userId },
    create: { userId, chatId: telegramId, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
}
