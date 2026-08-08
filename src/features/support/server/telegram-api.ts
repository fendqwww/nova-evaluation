import "server-only";
import { env } from "@/shared/config/env";
import { fitTelegram } from "../lib/format";
import { logError, logWarn } from "../lib/log";

/**
 * The Telegram Bot API, as much of it as this bot uses.
 *
 * A hand-rolled fetch wrapper rather than a bot framework (telegraf, grammy).
 * Those frameworks are built around a long-running process that owns the
 * update loop, and this app has no such process — Next.js App Router gives us
 * a request handler, so the update loop is Telegram's and the framework's main
 * abstraction would be dead weight. What is actually needed is six POSTs.
 *
 * Every call here is fire-and-check, never fire-and-forget: the return type
 * says whether it worked, and callers that must not proceed on failure check
 * it. What no call does is throw. A throw inside a webhook handler becomes a
 * non-2xx response, and Telegram answers a non-2xx by redelivering the same
 * update — so an exception on "send the confirmation" would replay "create the
 * ticket" forever. Failure is a logged `false`, and the handler decides.
 */

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface SentMessage {
  message_id: number;
  chat: { id: number };
}

/** Whether a support bot is configured at all. Everything else checks this. */
export function isSupportBotConfigured(): boolean {
  return Boolean(env.TELEGRAM_SUPPORT_BOT_TOKEN);
}

/**
 * One call to the Bot API.
 *
 * The token goes in the URL because that is the only place Telegram accepts
 * it — which is precisely why no failure path here logs the URL. `method` is
 * logged instead; it identifies the call without carrying the credential.
 */
async function callTelegram<T>(
  method: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  const token = env.TELEGRAM_SUPPORT_BOT_TOKEN;
  if (!token) {
    logWarn("telegram_call_skipped", { method, reason: "no_token" });
    return null;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // Telegram gives a webhook a limited budget before it retries the
      // update. An outgoing call that hangs longer than that would have the
      // handler still running while a duplicate of the same update arrives.
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const data = (await response.json()) as TelegramApiResponse<T>;

    if (!data.ok) {
      logWarn("telegram_call_failed", {
        method,
        code: data.error_code ?? response.status,
        description: data.description ?? null,
      });
      return null;
    }

    return data.result ?? null;
  } catch (error) {
    logError("telegram_call_error", error, { method });
    return null;
  }
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
