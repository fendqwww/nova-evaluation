import "server-only";
import { TICKETS_PAGE_SIZE } from "../constants";
import {
  ADMIN_HELP_MESSAGE,
  NOT_ADMIN_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
  formatHandle,
  replyPrompt,
  replySent,
  statsCard,
  ticketClosedForAdmin,
  ticketClosedForUser,
  ticketListLine,
  ticketNotFound,
  ticketTaken,
  ticketsHeader,
  supportReply,
} from "../lib/format";
import {
  noKeyboard,
  ticketActionsAfterTakeKeyboard,
  ticketActionsKeyboard,
} from "../lib/keyboards";
import { logInfo, logWarn } from "../lib/log";
import { parseTicketNumber } from "../lib/ticket-number";
import type { SupportCallback } from "../lib/callback";
import { isSupportAdmin } from "./admins";
import { notifyAdmins } from "./notify-support";
import { getSession, resetSession, startReply } from "./session.repository";
import {
  addTicketMessage,
  findTicketById,
  getSupportStats,
  listOpenTickets,
  setTicketStatus,
} from "./support.repository";
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  sendMessage,
  sendPhoto,
} from "./telegram-api";
import type { Sender } from "./user-flow";

/**
 * The support team's half of the bot.
 *
 * Two entry points into the same actions — slash commands and the buttons
 * under a ticket card — because they are used in different moments: a card
 * button is one tap on a notification that just arrived, a command is how you
 * work a backlog. Both funnel into the same three operations below, so there
 * is one implementation of "close a ticket" rather than two that drift.
 *
 * Authorisation is checked at the top of every exported function, against
 * SUPPORT_ADMIN_IDS. Never against which chat the update came from, and never
 * against the callback payload: a ticket card can be forwarded, and a
 * forwarded card's buttons still send valid-looking callback_data.
 */

/* ----------------------------------------------------------- commands --- */

export async function handleAdminCommand(
  sender: Sender,
  command: string,
  args: string,
): Promise<boolean> {
  if (!isSupportAdmin(sender.telegramId)) {
    // Only answered for commands that are actually admin-only — a user typing
    // /start must not be told about a permission system they are not in.
    await sendMessage(sender.chatId, NOT_ADMIN_MESSAGE);
    return true;
  }

  switch (command) {
    case "tickets":
      await sendTicketQueue(sender);
      return true;
    case "stats":
      await sendMessage(sender.chatId, statsCard(await getSupportStats()));
      return true;
    case "close":
      await closeByCommand(sender, args);
      return true;
    case "reply":
      await replyByCommand(sender, args);
      return true;
    case "admin":
      await sendMessage(sender.chatId, ADMIN_HELP_MESSAGE);
      return true;
    default:
      return false;
  }
}

/** Whether a command name is one only admins may run. */
export function isAdminCommand(command: string): boolean {
  return ["tickets", "stats", "close", "reply", "admin"].includes(command);
}

/**
 * The open queue, oldest first, each row with its own action buttons.
 *
 * One message per ticket rather than one long list, because a list cannot
 * carry per-row buttons — and a queue you can only act on by typing a command
 * is a queue that gets worked slowly.
 */
async function sendTicketQueue(sender: Sender): Promise<void> {
  const { tickets, total } = await listOpenTickets(TICKETS_PAGE_SIZE);

  await sendMessage(sender.chatId, ticketsHeader(total, tickets.length));

  for (const ticket of tickets) {
    await sendMessage(sender.chatId, ticketListLine(ticket), ticketActionsKeyboard(ticket.id));
  }
}

/**
 * /close NOVA-000042
 *
 * The ticket number is taken as support quotes it; parseTicketNumber accepts
 * the bare digits too.
 */
async function closeByCommand(sender: Sender, args: string): Promise<void> {
  const ticketId = parseTicketNumber(args);

  if (ticketId === null) {
    await sendMessage(sender.chatId, "Укажите номер: <code>/close NOVA-000001</code>");
    return;
  }

  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    await sendMessage(sender.chatId, ticketNotFound(args.trim()));
    return;
  }

  await closeTicket(sender, ticket.id);
}

/**
 * /reply NOVA-000042 текст ответа
 *
 * The one-shot form. With no text after the number it degrades into the same
 * two-step flow the "Ответить" button uses, rather than erroring — someone who
 * typed the number first and then realised the answer is long should not have
 * to retype the command.
 */
async function replyByCommand(sender: Sender, args: string): Promise<void> {
  const trimmed = args.trim();
  const separator = trimmed.indexOf(" ");
  const rawNumber = separator === -1 ? trimmed : trimmed.slice(0, separator);
  const text = separator === -1 ? "" : trimmed.slice(separator + 1).trim();

  const ticketId = parseTicketNumber(rawNumber);
  if (ticketId === null) {
    await sendMessage(
      sender.chatId,
      "Укажите номер и текст: <code>/reply NOVA-000001 Здравствуйте, ...</code>",
    );
    return;
  }

  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    await sendMessage(sender.chatId, ticketNotFound(rawNumber));
    return;
  }

  if (!text) {
    await startReply(sender.telegramId, ticket.id);
    await sendMessage(sender.chatId, replyPrompt(ticket.ticketNumber));
    return;
  }

  await deliverReply(sender, ticket.id, text);
}

/* -------------------------------------------------------- the actions --- */

/**
 * Send an answer to the user and record it.
 *
 * The status moves to ANSWERED only if the message actually reached the
 * user — a ticket marked answered when the reply failed to send is a ticket
 * that silently leaves the queue with the question unanswered, which is the
 * worst outcome this module can produce.
 */
export async function deliverReply(
  sender: Sender,
  ticketId: number,
  text: string,
): Promise<void> {
  const ticket = await findTicketById(ticketId);

  if (!ticket) {
    await sendMessage(sender.chatId, ticketNotFound(String(ticketId)));
    return;
  }

  const sent = await sendMessage(
    ticket.telegramId,
    supportReply(ticket.ticketNumber, text),
  );

  if (!sent) {
    logWarn("reply_undelivered", { ticket: ticket.ticketNumber });
    await sendMessage(
      sender.chatId,
      `⚠️ Не удалось доставить ответ пользователю ${formatHandle(ticket.username, ticket.telegramId)} — возможно, он заблокировал бота. Статус обращения не изменён.`,
    );
    return;
  }

  await addTicketMessage(ticket.id, "support", sender.telegramId, text);
  await setTicketStatus(ticket.id, "ANSWERED", sender.telegramId);
  await resetSession(sender.telegramId);

  logInfo("reply_sent", { ticket: ticket.ticketNumber, by: sender.telegramId });

  await sendMessage(sender.chatId, replySent(ticket.ticketNumber));
  await notifyAdmins(
    `✅ ${ticket.ticketNumber} — отвечен (${formatHandle(sender.username, sender.telegramId)}).`,
    sender.telegramId,
  );
}

async function takeTicket(sender: Sender, ticketId: number): Promise<void> {
  const ticket = await setTicketStatus(ticketId, "IN_PROGRESS", sender.telegramId);
  if (!ticket) return;

  const who = formatHandle(sender.username, sender.telegramId);

  await sendMessage(sender.chatId, ticketTaken(ticket.ticketNumber, who));
  await notifyAdmins(ticketTaken(ticket.ticketNumber, who), sender.telegramId);
}

/**
 * Close a ticket and tell the person who opened it.
 *
 * The user notification is not optional. A ticket that disappears from the
 * queue without a word is, from the other side, a question nobody ever
 * answered.
 */
async function closeTicket(sender: Sender, ticketId: number): Promise<void> {
  const ticket = await setTicketStatus(ticketId, "CLOSED", sender.telegramId);
  if (!ticket) return;

  await sendMessage(ticket.telegramId, ticketClosedForUser(ticket.ticketNumber));
  await sendMessage(sender.chatId, ticketClosedForAdmin(ticket.ticketNumber));
  await notifyAdmins(
    `🔒 ${ticket.ticketNumber} закрыт (${formatHandle(sender.username, sender.telegramId)}).`,
    sender.telegramId,
  );

  logInfo("ticket_closed", { ticket: ticket.ticketNumber, by: sender.telegramId });
}

/* ---------------------------------------------------------- callbacks --- */

/**
 * A tap on one of the three ticket buttons.
 *
 * `callbackQueryId` is answered on every path including the refusals —
 * Telegram leaves a spinner on the button until it is, so an unanswered
 * rejection looks like the bot hanging rather than like a "no".
 */
export async function handleTicketAction(
  sender: Sender,
  action: Extract<SupportCallback, { ticketId: number }>,
  callbackQueryId: string,
  messageId: number | null,
): Promise<void> {
  if (!isSupportAdmin(sender.telegramId)) {
    await answerCallbackQuery(callbackQueryId, "Доступно только команде поддержки.", true);
    logWarn("callback_denied", { telegramId: sender.telegramId, action: action.kind });
    return;
  }

  const ticket = await findTicketById(action.ticketId);
  if (!ticket) {
    await answerCallbackQuery(callbackQueryId, "Обращение не найдено.", true);
    return;
  }

  if (ticket.status === "CLOSED" && action.kind !== "close") {
    await answerCallbackQuery(callbackQueryId, "Обращение уже закрыто.", true);
    return;
  }

  try {
    switch (action.kind) {
      case "take":
        await answerCallbackQuery(callbackQueryId, "Взято в работу");
        await takeTicket(sender, ticket.id);
        // Retire the button that was just used, on this admin's copy of the
        // card. The other copies are separate messages in separate chats and
        // are kept in sync by the notifyAdmins line inside takeTicket.
        if (messageId !== null) {
          await editMessageReplyMarkup(
            sender.chatId,
            messageId,
            ticketActionsAfterTakeKeyboard(ticket.id),
          );
        }
        return;

      case "reply":
        await answerCallbackQuery(callbackQueryId, "Напишите текст ответа");
        await startReply(sender.telegramId, ticket.id);
        await sendMessage(sender.chatId, replyPrompt(ticket.ticketNumber));
        return;

      case "close":
        await answerCallbackQuery(callbackQueryId, "Закрыто");
        await closeTicket(sender, ticket.id);
        if (messageId !== null) {
          await editMessageReplyMarkup(sender.chatId, messageId, noKeyboard());
        }
        return;
    }
  } catch (error) {
    logWarn("callback_failed", { action: action.kind, ticket: ticket.ticketNumber });
    await sendMessage(sender.chatId, UNEXPECTED_ERROR_MESSAGE);
    throw error;
  }
}

/**
 * A message from an admin who is in `awaiting_reply`.
 *
 * Returns false when the admin is not mid-reply, so the caller can fall
 * through and treat the message as an ordinary one. An admin is also allowed
 * to be a user of the app, and this is the one place the two roles could
 * collide.
 */
export async function handleAdminReplyText(sender: Sender, text: string): Promise<boolean> {
  if (!isSupportAdmin(sender.telegramId)) return false;

  const session = await getSession(sender.telegramId);
  if (session.step !== "awaiting_reply" || session.activeTicketId === null) return false;

  await deliverReply(sender, session.activeTicketId, text);
  return true;
}

/**
 * A photo from an admin mid-reply: forwarded to the user as-is.
 *
 * The session deliberately stays in `awaiting_reply`. Support attaching a
 * screenshot is usually illustrating an answer they are about to type, so the
 * flow waits for the text rather than treating the image as the whole reply.
 */
export async function handleAdminReplyPhoto(sender: Sender, fileId: string): Promise<boolean> {
  if (!isSupportAdmin(sender.telegramId)) return false;

  const session = await getSession(sender.telegramId);
  if (session.step !== "awaiting_reply" || session.activeTicketId === null) return false;

  const ticket = await findTicketById(session.activeTicketId);
  if (!ticket) return false;

  const sent = await sendPhoto(ticket.telegramId, fileId, "💬 <b>Ответ поддержки NOVA</b>");
  if (!sent) {
    await sendMessage(sender.chatId, "⚠️ Не удалось доставить изображение пользователю.");
    return true;
  }

  await addTicketMessage(ticket.id, "support", sender.telegramId, "[изображение]");
  await sendMessage(sender.chatId, "📎 Изображение отправлено. Текст ответа — следующим сообщением.");
  return true;
}
