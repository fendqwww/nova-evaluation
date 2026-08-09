import {
  EVENING_WINDOW,
  MORNING_WINDOW,
  WINBACK_AFTER_DAYS,
  WINBACK_EVERY_DAYS,
  type NotificationKind,
} from "../constants";
import type { BotUserState } from "../server/user-state.repository";

/**
 * Решение «писать или нет», как чистая функция.
 *
 * Ни базы, ни сети, ни текущего времени изнутри — всё приходит аргументами.
 * Это сделано ради проверяемости: правила рассылки нельзя отладить в бою, не
 * разослав тысячу сообщений, поэтому единственный способ убедиться, что
 * человеку в отпуске не придёт «вы не записали ужин», — прогнать сценарии
 * тестом. Побочные эффекты живут в планировщике.
 *
 * Порядок решений здесь и есть приоритет: возврат важнее утреннего брифа, а
 * утренний важнее вечернего напоминания.
 */

export type NotificationDecision =
  | { send: true; kind: NotificationKind; reason: string }
  | { send: false; reason: string };

export interface DecisionContext {
  state: BotUserState;
  /** Что уже отправлено сегодня. */
  sentToday: ReadonlySet<NotificationKind>;
  /** Когда последний раз отправляли возвратное. */
  lastWinbackAt: Date | null;
  /** Сейчас — для расчёта, сколько прошло с прошлого возвратного. */
  now: Date;
}

export function decideNotification(context: DecisionContext): NotificationDecision {
  const { state, sentToday } = context;

  // Человек, который ни разу не открывал приложение, — не «ушедший»: он ещё
  // не приходил. Ему пишет онбординг-сообщение при /start, а не планировщик.
  if (state.daysSinceLastSeen === null) {
    return { send: false, reason: "никогда не заходил" };
  }

  const away = state.daysSinceLastSeen >= WINBACK_AFTER_DAYS;

  if (away) {
    return decideWinback(context);
  }

  if (inWindow(state.localHour, MORNING_WINDOW) && !sentToday.has("morning")) {
    return { send: true, kind: "morning", reason: "утреннее окно" };
  }

  if (inWindow(state.localHour, EVENING_WINDOW) && !sentToday.has("evening")) {
    return decideEvening(context);
  }

  return { send: false, reason: "вне окон отправки" };
}

/**
 * Возвратное сообщение.
 *
 * Уходит вместо утреннего, а не вдобавок: человеку, которого не было неделю,
 * бессмысленно писать «вчера вы спали 6 часов» — данных за вчера у него нет.
 */
function decideWinback(context: DecisionContext): NotificationDecision {
  const { state, sentToday, lastWinbackAt, now } = context;

  if (sentToday.has("winback")) {
    return { send: false, reason: "возвратное уже отправлено сегодня" };
  }

  // Окно то же, что у утреннего: сообщение «мы вас потеряли», пришедшее в
  // одиннадцать вечера, читается как упрёк.
  if (!inWindow(state.localHour, MORNING_WINDOW)) {
    return { send: false, reason: "вне утреннего окна" };
  }

  if (lastWinbackAt !== null) {
    const daysSince = Math.floor((now.getTime() - lastWinbackAt.getTime()) / 86_400_000);
    if (daysSince < WINBACK_EVERY_DAYS) {
      return { send: false, reason: `возвратное было ${daysSince} дн. назад` };
    }
  }

  return { send: true, kind: "winback", reason: `нет ${state.daysSinceLastSeen} дн.` };
}

/**
 * Вечернее — только если есть о чём сказать.
 *
 * Здесь единственное место, где бот молчит по содержательной причине, а не по
 * расписанию: у человека, который закрыл все привычки, записал еду и не имеет
 * просроченных задач, вечернее сообщение может быть только поздравлением, а
 * ежедневное поздравление обесценивается на третий день. Молчание — это тоже
 * сообщение, и в этом случае правильное.
 */
function decideEvening(context: DecisionContext): NotificationDecision {
  const { state } = context;

  const missedHabits = state.notifyHabits && state.habitsDoneToday < state.habitsDueToday;
  const missedNutrition = state.notifyNutrition && !state.loggedNutritionToday;
  const hasOverdue = state.notifyTasks && state.tasksOverdue > 0;

  if (!missedHabits && !missedNutrition && !hasOverdue) {
    return { send: false, reason: "день закрыт, напоминать не о чем" };
  }

  return { send: true, kind: "evening", reason: "есть незакрытое" };
}

/**
 * Попадает ли час в окно.
 *
 * Границы включительно снизу и исключительно сверху: окно 8–11 — это 8:00,
 * 9:00 и 10:00, а не четыре часа. Планировщик просыпается раз в час, поэтому
 * трёх часов хватает, чтобы никого не пропустить.
 */
function inWindow(hour: number, window: { from: number; to: number }): boolean {
  return hour >= window.from && hour < window.to;
}
