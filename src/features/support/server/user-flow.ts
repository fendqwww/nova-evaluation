import "server-only";
import {
  MAX_MESSAGE_LENGTH,
  MAX_SCREENSHOTS,
  MIN_MESSAGE_LENGTH,
  MAX_OPEN_TICKETS_PER_USER,
  categoryById,
} from "../constants";
import {
  CANCELLED_MESSAGE,
  HELP_MESSAGE,
  NEED_START_MESSAGE,
  SCREENSHOT_PROMPT,
  UNEXPECTED_ERROR_MESSAGE,
  WELCOME_MESSAGE,
  appendedToTicket,
  categoryPrompt,
  messageTooLong,
  messageTooShort,
  screenshotAdded,
  ticketCreated,
  tooManyOpenTickets,
} from "../lib/format";
import { categoryKeyboard, screenshotKeyboard } from "../lib/keyboards";
import { logError, logInfo } from "../lib/log";
import { categorySchema, ticketMessageSchema } from "../schemas";
import type { SupportCategoryId } from "../types";
import { notifyFollowUp, notifyNewTicket } from "./notify-support";
import {
  addDraftScreenshot,
  getSession,
  resetSession,
  setDraftMessage,
  startDraft,
} from "./session.repository";
import {
  addTicketMessage,
  createTicket,
  findLatestOpenTicket,
  hasTooManyOpenTickets,
  setTicketStatus,
} from "./support.repository";
import { sendMessage } from "./telegram-api";

/**
 * The user's half of the bot: from /start to a ticket number.
 *
 * The flow is a small state machine whose current state lives in
 * SupportSession — category → описание → скриншоты → отправка. Each handler
 * here answers one transition and nothing else; deciding *which* transition an
 * update is belongs to handle-update.ts.
 *
 * Every handler is written to be safe to run twice. Telegram redelivers an
 * update whenever a webhook does not answer 200 in time, and the failure that
 * would matter — two identical tickets from one description — is prevented by
 * the session moving out of `awaiting_message` before the ticket is created.
 */

export interface Sender {
  telegramId: string;
  chatId: number;
  username: string | null;
  firstName: string;
}

/* --------------------------------------------------------------- start --- */

/**
 * Map a deep-link payload onto a category.
 *
 * The subscription screen links to `?start=plan_plus` (see supportDeepLink in
 * shared/config/support.ts), so someone who already said "I want PLUS" lands
 * on the оплата branch instead of being shown a menu that asks them again.
 * Anything unrecognised falls through to the menu rather than guessing.
 */
function categoryFromPayload(payload: string | undefined): SupportCategoryId | null {
  if (!payload) return null;
  if (payload.startsWith("plan_")) return "billing";

  const parsed = categorySchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function handleStart(sender: Sender, payload?: string): Promise<void> {
  await resetSession(sender.telegramId);

  const preselected = categoryFromPayload(payload);
  if (preselected) {
    await beginCategory(sender, preselected);
    return;
  }

  await sendMessage(sender.chatId, WELCOME_MESSAGE, categoryKeyboard());
}

export async function handleHelp(sender: Sender): Promise<void> {
  await sendMessage(sender.chatId, HELP_MESSAGE);
}

export async function handleCancel(sender: Sender): Promise<void> {
  await resetSession(sender.telegramId);
  await sendMessage(sender.chatId, CANCELLED_MESSAGE);
}

/* ------------------------------------------------------------ category --- */

/**
 * Category chosen — start collecting the description.
 *
 * The open-ticket ceiling is enforced here rather than at submit time on
 * purpose: telling someone they are at the limit *before* they type three
 * paragraphs is the difference between a rule and an insult.
 */
export async function beginCategory(
  sender: Sender,
  category: SupportCategoryId,
): Promise<void> {
  if (await hasTooManyOpenTickets(sender.telegramId)) {
    await sendMessage(sender.chatId, tooManyOpenTickets(MAX_OPEN_TICKETS_PER_USER));
    return;
  }

  await startDraft(sender.telegramId, category);
  await sendMessage(sender.chatId, categoryPrompt(category));
}

/* --------------------------------------------------------------- text --- */

/**
 * A plain text message, interpreted by where the conversation is.
 *
 * The three branches are the three things a text message can mean here: the
 * description of a new ticket, extra detail added while attachments are being
 * collected, or a follow-up on a ticket that already exists.
 */
export async function handleUserText(sender: Sender, text: string): Promise<void> {
  const session = await getSession(sender.telegramId);

  if (session.step === "awaiting_message") {
    await captureDescription(sender, text);
    return;
  }

  if (session.step === "awaiting_screenshot") {
    await appendToDescription(sender, text);
    return;
  }

  await handleIdleText(sender, text);
}

async function captureDescription(sender: Sender, text: string): Promise<void> {
  const parsed = ticketMessageSchema.safeParse(text);

  if (!parsed.success) {
    const trimmed = text.trim();
    await sendMessage(
      sender.chatId,
      trimmed.length > MAX_MESSAGE_LENGTH
        ? messageTooLong(MAX_MESSAGE_LENGTH)
        : messageTooShort(MIN_MESSAGE_LENGTH),
    );
    return;
  }

  await setDraftMessage(sender.telegramId, parsed.data);
  await sendMessage(sender.chatId, SCREENSHOT_PROMPT, screenshotKeyboard(false));
}

/**
 * More text while we are asking for screenshots.
 *
 * Appended to the description rather than refused. Someone who remembers one
 * more detail at this point is doing the right thing, and answering them with
 * "прикрепите скриншот или нажмите Пропустить" would train them to stop
 * volunteering information. The combined text is re-validated so the ceiling
 * still holds.
 */
async function appendToDescription(sender: Sender, text: string): Promise<void> {
  const session = await getSession(sender.telegramId);
  const combined = `${session.draftMessage ?? ""}\n\n${text.trim()}`.trim();

  if (combined.length > MAX_MESSAGE_LENGTH) {
    await sendMessage(sender.chatId, messageTooLong(MAX_MESSAGE_LENGTH));
    return;
  }

  // setDraftMessage keeps the step at awaiting_screenshot, so this can repeat.
  await setDraftMessage(sender.telegramId, combined);
  await sendMessage(
    sender.chatId,
    "✍️ Добавили к описанию. Прикрепите скриншот или отправьте обращение.",
    screenshotKeyboard(session.draftScreenshots.length > 0),
  );
}

/**
 * Text with no draft in progress.
 *
 * If the user has a live ticket this is a follow-up and belongs on it — an
 * answered ticket goes back to IN_PROGRESS, because a reply that prompted
 * another question was not the end of the conversation. With no live ticket
 * there is nothing to attach it to, and the category menu is what makes the
 * difference between a routed request and a message in a pile.
 */
async function handleIdleText(sender: Sender, text: string): Promise<void> {
  const ticket = await findLatestOpenTicket(sender.telegramId);

  if (!ticket) {
    await sendMessage(sender.chatId, NEED_START_MESSAGE, categoryKeyboard());
    return;
  }

  await addTicketMessage(ticket.id, "user", sender.telegramId, text);

  if (ticket.status === "ANSWERED") {
    await setTicketStatus(ticket.id, "IN_PROGRESS");
  }

  await notifyFollowUp(ticket, text);
  await sendMessage(sender.chatId, appendedToTicket(ticket.ticketNumber));
}

/* -------------------------------------------------------- attachments --- */

/**
 * A photo, interpreted by where the conversation is.
 *
 * During a draft it becomes an attachment. Outside one it goes onto the live
 * ticket if there is one — a screenshot sent right after a reply is almost
 * always the answer to "покажите, как это выглядит".
 */
export async function handleUserPhoto(sender: Sender, fileId: string): Promise<void> {
  const session = await getSession(sender.telegramId);

  if (session.step === "awaiting_screenshot") {
    const count = await addDraftScreenshot(sender.telegramId, fileId);

    // At the cap the flow stops asking and submits: continuing to offer a
    // button that can no longer do anything is worse than moving on.
    if (count >= MAX_SCREENSHOTS) {
      await sendMessage(sender.chatId, screenshotAdded(count, MAX_SCREENSHOTS));
      await submitTicket(sender);
      return;
    }

    await sendMessage(
      sender.chatId,
      screenshotAdded(count, MAX_SCREENSHOTS),
      screenshotKeyboard(true),
    );
    return;
  }

  if (session.step === "awaiting_message") {
    await sendMessage(
      sender.chatId,
      "Сначала опишите проблему текстом — скриншот попросим следующим шагом.",
    );
    return;
  }

  const ticket = await findLatestOpenTicket(sender.telegramId);
  if (!ticket) {
    await sendMessage(sender.chatId, NEED_START_MESSAGE, categoryKeyboard());
    return;
  }

  await addTicketMessage(ticket.id, "user", sender.telegramId, "[скриншот]");
  await notifyFollowUp(ticket, "Пользователь прислал скриншот.", [fileId]);
  await sendMessage(sender.chatId, appendedToTicket(ticket.ticketNumber));
}

/* ------------------------------------------------------------- submit --- */

/**
 * Turn the draft into a ticket.
 *
 * Order matters and is deliberate: the session is cleared *after* the ticket
 * is committed but *before* the notification fan-out, so a slow or failing
 * Telegram call cannot leave the user stuck in a draft they already submitted.
 * If the confirmation itself fails to send, the ticket still exists and the
 * team still has it — that is the right way round for the failure to land.
 */
export async function submitTicket(sender: Sender): Promise<void> {
  const session = await getSession(sender.telegramId);

  if (!session.draftCategory || !session.draftMessage) {
    await sendMessage(sender.chatId, NEED_START_MESSAGE, categoryKeyboard());
    return;
  }

  try {
    const ticket = await createTicket({
      telegramId: sender.telegramId,
      username: sender.username,
      firstName: sender.firstName,
      category: session.draftCategory,
      message: session.draftMessage,
      screenshots: session.draftScreenshots,
    });

    await resetSession(sender.telegramId);

    logInfo("ticket_created", {
      ticket: ticket.ticketNumber,
      category: ticket.category,
      screenshots: ticket.screenshots.length,
    });

    await sendMessage(
      sender.chatId,
      ticketCreated(ticket.ticketNumber, categoryById(ticket.category).id),
    );
    await notifyNewTicket(ticket);
  } catch (error) {
    logError("ticket_create_failed", error, { telegramId: sender.telegramId });
    await sendMessage(sender.chatId, UNEXPECTED_ERROR_MESSAGE);
  }
}
