import "server-only";
import { decideNotification } from "../lib/rules";
import { eveningMessage, morningMessage, winbackMessage, type BotMessage } from "../lib/messages";
import { logInfo, logWarn } from "../lib/log";
import type { NotificationKind } from "../constants";
import { sendBotMessage } from "./bot-api";
import { UNSUBSCRIBE_BUTTON } from "./handle-update";
import { markBlocked } from "./subscriber.repository";
import {
  claimDelivery,
  deliveredToday,
  lastDeliveryOf,
  listNotifiableUsers,
  releaseDelivery,
  type BotUserState,
} from "./user-state.repository";
import { TELEGRAM_APP_URL } from "@/shared/config/app-bot";

/**
 * Один проход рассылки.
 *
 * Запускается раз в час по расписанию Vercel Cron. Сам решает, кому сейчас
 * уместно написать: раз в час — потому что «утро» у пользователей наступает в
 * разное время, и рассылка, запущенная один раз в сутки, попала бы в утро
 * ровно одного часового пояса.
 *
 * Порядок операций для каждого человека жёсткий и важен именно в таком виде:
 *
 *   1. решить (чистая функция, без побочных эффектов);
 *   2. занять право на отправку (атомарная вставка в BotDelivery);
 *   3. отправить;
 *   4. если не отправилось — освободить занятое.
 *
 * Занять раньше отправки, а не после: между «отправили» и «записали» помещается
 * второй запуск планировщика целиком, и человек получил бы два одинаковых
 * сообщения. Обратный порядок теряет сообщение при сбое записи — это лучше, чем
 * дубль: пропущенное напоминание никто не заметит, а два подряд заметят все.
 */

export interface SweepResult {
  considered: number;
  sent: number;
  skipped: number;
  blocked: number;
  failed: number;
}

export async function runNotificationSweep(): Promise<SweepResult> {
  const users = await listNotifiableUsers();
  const result: SweepResult = {
    considered: users.length,
    sent: 0,
    skipped: 0,
    blocked: 0,
    failed: 0,
  };

  const now = new Date();

  for (const state of users) {
    const [sentToday, lastWinbackAt] = await Promise.all([
      deliveredToday(state.userId, state.today),
      lastDeliveryOf(state.userId, "winback"),
    ]);

    const decision = decideNotification({ state, sentToday, lastWinbackAt, now });

    if (!decision.send) {
      result.skipped += 1;
      continue;
    }

    const outcome = await deliver(state, decision.kind);

    if (outcome === "sent") result.sent += 1;
    else if (outcome === "blocked") result.blocked += 1;
    else if (outcome === "claimed") result.skipped += 1;
    else result.failed += 1;
  }

  logInfo("sweep_done", { ...result });
  return result;
}

type DeliveryResult = "sent" | "blocked" | "failed" | "claimed";

async function deliver(
  state: BotUserState,
  kind: NotificationKind,
): Promise<DeliveryResult> {
  // Занимаем место до отправки. Отказ означает, что параллельный запуск уже
  // взял его — и он же отправит.
  const claimed = await claimDelivery(state.userId, kind, state.today);
  if (!claimed) return "claimed";

  const message = buildMessage(state, kind);
  const outcome = await sendBotMessage(state.chatId, message.text, keyboardFor(message, kind));

  if (outcome === "sent") {
    logInfo("sent", { userId: state.userId, kind });
    return "sent";
  }

  // Не отправилось — освобождаем место, чтобы следующий заход мог попробовать
  // снова. Кроме случая блокировки: там пробовать больше незачем, и запись
  // остаётся как след того, что мы пытались.
  if (outcome === "blocked") {
    await markBlocked(state.userId);
    logWarn("blocked", { userId: state.userId });
    return "blocked";
  }

  await releaseDelivery(state.userId, kind, state.today);
  logWarn("send_failed", { userId: state.userId, kind });
  return "failed";
}

function buildMessage(state: BotUserState, kind: NotificationKind): BotMessage {
  switch (kind) {
    case "morning":
      return morningMessage(state);
    case "evening":
      return eveningMessage(state);
    case "winback":
      return winbackMessage(state);
  }
}

/**
 * Кнопки под сообщением.
 *
 * «Больше не писать» есть только у возвратных. У утренних и вечерних её нет
 * намеренно: это сводки для человека, который пользуется приложением, и
 * предлагать ему отписаться в каждом сообщении — значит подсказывать, что
 * сообщения мешают. У возвратных наоборот: они уходят тому, кто не заходит, и
 * без явной кнопки его единственный способ прекратить это — кнопка «Спам»,
 * которая стоит нам бота, а не одного подписчика.
 */
function keyboardFor(message: BotMessage, kind: NotificationKind) {
  const openApp = {
    text: message.buttonText,
    url: `${TELEGRAM_APP_URL}=${encodeURIComponent(message.deepLink)}`,
  };

  return kind === "winback"
    ? { inline_keyboard: [[openApp], [UNSUBSCRIBE_BUTTON]] }
    : { inline_keyboard: [[openApp]] };
}
