import "server-only";
import { RATE_LIMITED_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from "../lib/format";
import { parseCallback, type SupportCallback } from "../lib/callback";
import { logError, logInfo, logWarn } from "../lib/log";
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate, TelegramUser } from "../schemas";
import { isSupportAdmin } from "./admins";
import { handleAdminCommand, handleAdminReplyPhoto, handleAdminReplyText, handleTicketAction, isAdminCommand } from "./admin-flow";
import { consumeRateLimit } from "./session.repository";
import { answerCallbackQuery, sendMessage } from "./telegram-api";
import {
  beginCategory,
  handleCancel,
  handleHelp,
  handleStart,
  handleUserPhoto,
  handleUserText,
  submitTicket,
  type Sender,
} from "./user-flow";

/**
 * One Telegram update in, one set of side effects out.
 *
 * This module is only routing: it decides *which* handler an update belongs
 * to and never decides what that handler says. The three questions it answers
 * are who sent this, are they allowed to be heard right now, and what kind of
 * thing did they send.
 *
 * It never throws. The webhook route must answer 200 even for an update it
 * could not process, because Telegram treats anything else as "try again" and
 * will redeliver the same update on a schedule — turning one unhandled edge
 * case into a permanent retry loop that blocks every update behind it.
 */

/** Telegram's numeric ids as the database stores them: strings. */
function toSender(from: TelegramUser, chatId: number): Sender {
  return {
    telegramId: String(from.id),
    chatId,
    username: from.username ?? null,
    // A Telegram account always has a first name, but the field is optional in
    // the API's own schema, so the fallback is real rather than defensive
    // decoration.
    firstName: from.first_name ?? "Пользователь",
  };
}

/**
 * Split "/reply@evaluationsupport_bot NOVA-1 текст" into command and arguments.
 *
 * The `@botname` suffix is what Telegram appends when a command is used in a
 * group. This bot works in DMs, but stripping it costs one line and means a
 * command copied out of a group chat still works.
 */
function parseCommand(text: string): { command: string; args: string } | null {
  if (!text.startsWith("/")) return null;

  const separator = text.indexOf(" ");
  const head = separator === -1 ? text : text.slice(0, separator);
  const args = separator === -1 ? "" : text.slice(separator + 1);

  return { command: head.slice(1).split("@")[0].toLowerCase(), args };
}

/**
 * The screenshot in a message, if there is one.
 *
 * A compressed photo arrives as an array of sizes, largest last — that is the
 * one worth keeping. An image sent "as a file" arrives as a document instead,
 * which is how a careful bug reporter sends a screenshot, so it is accepted
 * too. Non-image documents are ignored: this bot has no use for a PDF and
 * pretending otherwise would promise a review nobody is going to do.
 */
function extractFileId(message: TelegramMessage): string | null {
  if (message.photo && message.photo.length > 0) {
    return message.photo[message.photo.length - 1].file_id;
  }

  if (message.document?.mime_type?.startsWith("image/")) {
    return message.document.file_id;
  }

  return null;
}

/* ------------------------------------------------------------ message --- */

/**
 * Count an update against the sender's budget, and say whether to serve it.
 *
 * Applied to button taps as well as to messages. A tap is not free — picking a
 * category writes a session row, and a keyboard can be tapped as fast as a
 * script can POST — so limiting only typed messages would leave the cheaper
 * half of the surface open.
 *
 * Support staff are exempt. The limit exists to stop a script from filling the
 * ticket table; applying it to the people answering the queue would mean an
 * incident that produces a burst of replies locks out the person handling it.
 *
 * `notify` is passed only for messages. A rate-limited button tap is answered
 * through answerCallbackQuery by the caller instead, because a chat message
 * sent in response to a tap the user cannot see the result of is just more
 * noise during a flood.
 */
async function allowUpdate(sender: Sender, notify: boolean): Promise<boolean> {
  if (isSupportAdmin(sender.telegramId)) return true;

  const verdict = await consumeRateLimit(sender.telegramId);
  if (verdict.allowed) return true;

  // Announced once per cooldown. Repeating it on every message of a flood
  // would make the bot the loudest participant in that flood.
  if (verdict.justBlocked) {
    logWarn("rate_limited", { telegramId: sender.telegramId });
    if (notify) await sendMessage(sender.chatId, RATE_LIMITED_MESSAGE);
  }

  return false;
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const from = message.from;

  // No sender, or another bot. Channel posts and bot chatter are not support
  // requests and must not open tickets.
  if (!from || from.is_bot) return;

  const sender = toSender(from, message.chat.id);

  if (!(await allowUpdate(sender, true))) return;

  const text = message.text ?? message.caption ?? "";
  const fileId = extractFileId(message);
  const command = text ? parseCommand(text) : null;

  if (command) {
    await handleCommand(sender, command.command, command.args);
    return;
  }

  if (fileId) {
    // An admin composing a reply gets first refusal on their own messages;
    // handleAdminReplyPhoto returns false when they are not mid-reply, and the
    // update falls through to the ordinary user path. An admin is allowed to
    // also be a user of the app, and this is where the two roles could collide.
    if (await handleAdminReplyPhoto(sender, fileId)) return;
    await handleUserPhoto(sender, fileId);
    return;
  }

  if (text.trim()) {
    if (await handleAdminReplyText(sender, text)) return;
    await handleUserText(sender, text);
    return;
  }

  // Stickers, voice notes, locations — nothing this bot can file. Silence is
  // the wrong answer (the user is waiting), a lecture is worse.
  await sendMessage(
    sender.chatId,
    "Пока я понимаю только текст и скриншоты. Опишите проблему словами — так мы сможем помочь.",
  );
}

async function handleCommand(sender: Sender, command: string, args: string): Promise<void> {
  if (isAdminCommand(command)) {
    await handleAdminCommand(sender, command, args);
    return;
  }

  switch (command) {
    case "start":
      // The argument is a deep-link payload (see supportDeepLink), which is how
      // the subscription screen lands a user straight in the "оплата" branch.
      await handleStart(sender, args.trim() || undefined);
      return;
    case "cancel":
    case "stop":
      await handleCancel(sender);
      return;
    case "help":
      await handleHelp(sender);
      return;
    default:
      await sendMessage(
        sender.chatId,
        "Не знаю такой команды. Отправьте /start, чтобы создать обращение, или /help для справки.",
      );
  }
}

/* ----------------------------------------------------- callback query --- */

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const chatId = query.message?.chat.id ?? query.from.id;
  const sender = toSender(query.from, chatId);

  if (!(await allowUpdate(sender, false))) {
    // Answered so the button stops spinning, and answered with the reason so a
    // real user who tapped twice too fast is not left guessing.
    await answerCallbackQuery(query.id, "Слишком часто. Подождите пару минут.", true);
    return;
  }

  const action = parseCallback(query.data);

  if (!action) {
    // Answer anyway: an unanswered callback leaves a spinner on the button
    // that eventually times out looking like the bot is broken.
    await answerCallbackQuery(query.id);
    logWarn("callback_unrecognised", { data: query.data ?? "" });
    return;
  }

  switch (action.kind) {
    case "category":
      await answerCallbackQuery(query.id);
      await beginCategory(sender, action.category);
      return;

    case "skip-screenshots":
    case "submit":
      await answerCallbackQuery(query.id, "Отправляем…");
      await submitTicket(sender);
      return;

    case "cancel":
      await answerCallbackQuery(query.id, "Отменено");
      await handleCancel(sender);
      return;

    case "take":
    case "reply":
    case "close":
    case "grant":
      await handleTicketAction(sender, action, query.id, query.message?.message_id ?? null);
      return;

    default: {
      // Проверка полноты на этапе компиляции.
      //
      // Здесь была настоящая ошибка: в SupportCallback появился вариант
      // "grant", а этот switch о нём не знал — нажатие на «Выдать PLUS»
      // проваливалось мимо всех веток, функция молча заканчивалась, и кнопка
      // просто ничего не делала. Ни ошибки, ни записи в журнале: снаружи это
      // выглядело как «тариф не выдаётся», и найти причину можно было только
      // чтением роутера.
      //
      // Присваивание `never` превращает такой пропуск в ошибку сборки:
      // добавить вариант в тип и забыть про него здесь больше нельзя.
      const unhandled: never = action;
      logWarn("callback_unhandled", { kind: (unhandled as SupportCallback).kind });
      await answerCallbackQuery(query.id);
      return;
    }
  }
}

/* ------------------------------------------------------------- router --- */

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }

    if (update.message) {
      await handleMessage(update.message);
      return;
    }

    // edited_message and everything else the allowed_updates list does not
    // subscribe to. Nothing to do, and nothing wrong.
    logInfo("update_ignored", { updateId: update.update_id });
  } catch (error) {
    logError("update_failed", error, { updateId: update.update_id });

    // Best-effort apology so the user is not left staring at a chat that
    // stopped answering. If this send fails too there is nothing further to
    // try, and the swallow is deliberate: the caller must still answer 200.
    const chatId = update.message?.chat.id ?? update.callback_query?.from.id;
    if (chatId !== undefined) {
      await sendMessage(chatId, UNEXPECTED_ERROR_MESSAGE).catch(() => undefined);
    }
  }
}
