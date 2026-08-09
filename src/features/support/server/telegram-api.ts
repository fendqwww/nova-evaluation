import "server-only";
import { env } from "@/shared/config/env";
import { callBotApi, type InlineKeyboardMarkup, type SentMessage } from "@/server/telegram/bot-api";
import { fitTelegram } from "../lib/format";
import { logError, logWarn } from "../lib/log";

/**
 * Bot API бота поддержки.
 *
 * Транспорт переехал в server/telegram/bot-api.ts, потому что основному боту
 * нужен ровно тот же код с другим токеном. Здесь осталось то, что относится
 * именно к поддержке: какие методы она вызывает и как обрезает свои тексты.
 *
 * Свойства транспорта не изменились и по-прежнему важны: ни один вызов не
 * бросает исключение. Исключение внутри вебхука становится ответом не-2xx, а
 * на не-2xx Telegram присылает то же обновление снова — неудачная отправка
 * подтверждения заставила бы бесконечно пересоздавать тикет.
 */

export type { InlineKeyboardMarkup, SentMessage };
export type { InlineKeyboardButton } from "@/server/telegram/bot-api";

/** Whether a support bot is configured at all. Everything else checks this. */
export function isSupportBotConfigured(): boolean {
  return Boolean(env.TELEGRAM_SUPPORT_BOT_TOKEN);
}

async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  const token = env.TELEGRAM_SUPPORT_BOT_TOKEN;
  if (!token) {
    logWarn("telegram_call_skipped", { method, reason: "no_token" });
    return null;
  }

  const { result } = await callBotApi<T>(token, method, payload, {
    warn: logWarn,
    error: logError,
  });
  return result;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<SentMessage | null> {
  return callTelegram<SentMessage>("sendMessage", {
    chat_id: chatId,
    text: fitTelegram(text),
    parse_mode: "HTML",
    // The bot's own messages are the only link previews a support chat could
    // produce, and a preview of a URL a user pasted into a bug report is both
    // noise and an unsolicited fetch of their link.
    link_preview_options: { is_disabled: true },
    reply_markup: replyMarkup,
  });
}

/**
 * Forward a screenshot by file_id.
 *
 * No bytes move through this server: a file_id is a handle Telegram resolves
 * on its own side, so a screenshot goes from the user's chat to the support
 * chat without ever being downloaded, stored, or counted against the app's
 * disk. It is also why SupportTicket.screenshots holds ids rather than images.
 */
export async function sendPhoto(
  chatId: string | number,
  fileId: string,
  caption?: string,
): Promise<SentMessage | null> {
  return callTelegram<SentMessage>("sendPhoto", {
    chat_id: chatId,
    photo: fileId,
    caption: caption ? fitTelegram(caption) : undefined,
    parse_mode: caption ? "HTML" : undefined,
  });
}

/**
 * Acknowledge a button tap.
 *
 * Not optional politeness: until this is called Telegram shows a loading
 * spinner on the button for everyone in the chat, and it eventually times out
 * looking like the bot is broken. Every callback path answers, including the
 * ones that reject the tap.
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    // Telegram truncates a toast at 200 characters and rejects longer alerts.
    text: text ? text.slice(0, 190) : undefined,
    show_alert: showAlert,
  });
}

/**
 * Replace the buttons under an already-sent message.
 *
 * Used to retire actions that have been taken — a ticket card whose "Взять в
 * работу" button is gone is how a second admin sees, without asking, that the
 * first one already has it.
 */
export async function editMessageReplyMarkup(
  chatId: string | number,
  messageId: number,
  replyMarkup: InlineKeyboardMarkup,
): Promise<void> {
  await callTelegram("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

/**
 * Point Telegram at this deployment's webhook.
 *
 * `drop_pending_updates` clears anything queued while the webhook was
 * unset — on a redeploy that backlog is stale by definition, and replaying it
 * would answer questions from hours ago as if they had just arrived.
 */
export async function setWebhook(url: string, secretToken: string): Promise<boolean> {
  const result = await callTelegram<boolean>("setWebhook", {
    url,
    secret_token: secretToken,
    // Only what this bot handles. Narrowing the subscription means Telegram
    // stops delivering update types no code path reads.
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
    max_connections: 40,
  });
  return result === true;
}

export interface WebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
}

export async function getWebhookInfo(): Promise<WebhookInfo | null> {
  return callTelegram<WebhookInfo>("getWebhookInfo", {});
}

export async function deleteWebhook(): Promise<boolean> {
  const result = await callTelegram<boolean>("deleteWebhook", {
    drop_pending_updates: false,
  });
  return result === true;
}

export interface BotInfo {
  id: number;
  username?: string;
  first_name?: string;
}

export async function getMe(): Promise<BotInfo | null> {
  return callTelegram<BotInfo>("getMe", {});
}

/**
 * Register the command list Telegram shows in the "/" menu.
 *
 * Only the user-facing commands. The admin ones are deliberately absent: a
 * menu that advertises /close to everyone invites a stream of taps the bot can
 * only answer with "нет".
 */
export async function setMyCommands(): Promise<boolean> {
  const result = await callTelegram<boolean>("setMyCommands", {
    commands: [
      { command: "start", description: "Создать обращение" },
      { command: "cancel", description: "Отменить текущее обращение" },
      { command: "help", description: "Справка" },
    ],
  });
  return result === true;
}
