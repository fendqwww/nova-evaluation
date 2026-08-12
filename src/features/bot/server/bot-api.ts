import "server-only";
import { env } from "@/shared/config/env";
import {
  callBotApi,
  fitMessage,
  isPermanentDeliveryFailure,
  type InlineKeyboardMarkup,
  type SentMessage,
} from "@/server/telegram/bot-api";
import { logError, logWarn } from "../lib/log";

/**
 * Основной бот — тот, в котором открывается приложение.
 *
 * Токен у него собственный (TELEGRAM_BOT_TOKEN) и это принципиально: тот же
 * токен подписывает initData Mini App, то есть является ключом ко входу в
 * аккаунт. Бот поддержки живёт на отдельном токене именно ради того, чтобы
 * поток тикетов и поверхность авторизации нельзя было скомпрометировать одной
 * утечкой.
 */

export type { InlineKeyboardMarkup, SentMessage };

const log = { warn: logWarn, error: logError };

/** Результат отправки: дошло, не дошло временно, или бот заблокирован. */
export type DeliveryOutcome = "sent" | "failed" | "blocked";

export async function sendBotMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<DeliveryOutcome> {
  const { result, errorCode } = await callBotApi<SentMessage>(
    env.TELEGRAM_BOT_TOKEN,
    "sendMessage",
    {
      chat_id: chatId,
      text: fitMessage(text),
      parse_mode: "HTML",
      // Единственные ссылки в сообщениях бота — его собственные, и разворачивать
      // их превью незачем.
      link_preview_options: { is_disabled: true },
      reply_markup: replyMarkup,
    },
    log,
  );

  if (result) return "sent";
  return isPermanentDeliveryFailure(errorCode) ? "blocked" : "failed";
}

/** Погасить «часики» на нажатой кнопке. */
export async function answerBotCallback(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await callBotApi(
    env.TELEGRAM_BOT_TOKEN,
    "answerCallbackQuery",
    { callback_query_id: callbackQueryId, text },
    log,
  );
}

/** Убрать кнопки с уже отправленного сообщения. */
export async function editBotReplyMarkup(
  chatId: string | number,
  messageId: number,
  replyMarkup: InlineKeyboardMarkup,
): Promise<void> {
  await callBotApi(
    env.TELEGRAM_BOT_TOKEN,
    "editMessageReplyMarkup",
    { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup },
    log,
  );
}

/**
 * Список команд, который Telegram показывает в меню рядом с полем ввода.
 *
 * Вызывается один раз при настройке вебхука. Без него команды работают, но
 * пользователь о них не знает — а команда, о существовании которой нужно
 * догадаться, не существует.
 *
 * РЕГИСТРИРУЕТСЯ БЕЗ `language_code`, И ЭТО ИСПРАВЛЕНИЕ. Раньше список уходил с
 * `language_code: "ru"`. Telegram считает такой список переводом, а не набором
 * команд: он показывается только тем, у кого интерфейс Telegram русский, и
 * подменяет собой список по умолчанию — которого не существовало. Человек с
 * английским интерфейсом (а это заметная доля пользователей и, что важнее,
 * почти все, кто заходит с рабочего аккаунта) видел пустое меню команд и
 * закономерно решал, что «команды не работают». Сами команды при этом работали:
 * набранное руками /today отвечало как надо, — что и делало жалобу такой
 * непонятной.
 *
 * Список на русском по умолчанию честнее пустого: приложение русскоязычное, и
 * пользователь с английским интерфейсом всё равно увидит русские описания
 * внутри Mini App.
 */
export async function setBotCommands(
  commands: ReadonlyArray<{ command: string; description: string }>,
): Promise<boolean> {
  const { result } = await callBotApi<boolean>(
    env.TELEGRAM_BOT_TOKEN,
    "setMyCommands",
    { commands, scope: { type: "all_private_chats" } },
    log,
  );
  return result === true;
}

/** Кому и куда сейчас доставляются обновления — для диагностики. */
export interface BotWebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  ip_address?: string;
}

export interface BotIdentity {
  id: number;
  username?: string;
  first_name?: string;
}

/**
 * Кто этот бот. Первый вопрос диагностики: живой ли токен вообще.
 *
 * Принимает токен параметром, а не берёт из env, ровно затем, чтобы одной
 * функцией опрашивать оба бота — основной и поддержки.
 */
export async function getBotIdentity(token: string): Promise<BotIdentity | null> {
  const { result } = await callBotApi<BotIdentity>(token, "getMe", {}, log);
  return result;
}

/**
 * Что Telegram думает о нашем вебхуке.
 *
 * Самое ценное поле здесь — `last_error_message`: именно оно отвечает на вопрос
 * «почему бот молчит», и без него причину приходится угадывать между забытым
 * setup, неверным секретом и упавшим деплоем.
 */
export async function getBotWebhookInfo(token: string): Promise<BotWebhookInfo | null> {
  const { result } = await callBotApi<BotWebhookInfo>(token, "getWebhookInfo", {}, log);
  return result;
}

/** Кнопка меню слева от поля ввода — открывает Mini App. */
export async function setBotMenuButton(appUrl: string): Promise<boolean> {
  const { result } = await callBotApi<boolean>(
    env.TELEGRAM_BOT_TOKEN,
    "setChatMenuButton",
    { menu_button: { type: "web_app", text: "Открыть Nova", web_app: { url: appUrl } } },
    log,
  );
  return result === true;
}

export async function setBotWebhook(url: string, secret: string): Promise<boolean> {
  const { result } = await callBotApi<boolean>(
    env.TELEGRAM_BOT_TOKEN,
    "setWebhook",
    {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query", "my_chat_member"],
      drop_pending_updates: true,
    },
    log,
  );
  return result === true;
}
