import "server-only";
import { escapeHtml, followUpCard, ticketCard } from "../lib/format";
import { ticketActionsKeyboard } from "../lib/keyboards";
import { logInfo, logWarn } from "../lib/log";
import type { SupportTicketView } from "../types";
import { hasNoAdmins, supportAdminIds } from "./admins";
import { sendMessage, sendPhoto } from "./telegram-api";

/**
 * Getting a ticket in front of a human.
 *
 * Delivery is to each admin's DM. The alternative — one shared group — was not
 * chosen because it needs a chat to exist, the bot to be added to it and its
 * id to be discovered before a single ticket can be routed, which is three
 * ways for a deploy to silently drop support requests. A DM works the moment
 * an id is in SUPPORT_ADMIN_IDS.
 *
 * Nothing here throws. A ticket is already committed by the time this runs, so
 * a failed notification must not undo it or make Telegram redeliver the update
 * that created it — the ticket is in the database and /tickets will still find
 * it. Failures are logged loudly because that log line is the only signal that
 * a request is sitting unseen.
 */

/**
 * Fan out to every admin.
 *
 * Sequential rather than Promise.all: Telegram rate-limits a bot to roughly 30
 * messages a second across all chats, and a burst of parallel sends against a
 * long roster is how a bot earns a 429 on the one message that mattered. A
 * support team is a handful of people, so the ordering costs nothing.
 */
async function fanOut(send: (adminId: string) => Promise<boolean>): Promise<number> {
  let delivered = 0;

  for (const adminId of supportAdminIds()) {
    // A single admin who never pressed /start on the bot cannot receive
    // messages from it — Telegram answers 403. That must not stop the others
    // from being notified, so each send is independent.
    if (await send(adminId)) delivered += 1;
  }

  return delivered;
}

export async function notifyNewTicket(ticket: SupportTicketView): Promise<void> {
  if (hasNoAdmins()) {
    logWarn("ticket_unrouted", {
      ticket: ticket.ticketNumber,
      reason: "SUPPORT_ADMIN_IDS is empty",
    });
    return;
  }

  const card = ticketCard(ticket);
  const keyboard = ticketActionsKeyboard(ticket.id);

  const delivered = await fanOut(async (adminId) => {
    const sent = await sendMessage(adminId, card, keyboard);
    if (!sent) return false;

    // Screenshots follow the card rather than being its cover photo: a photo
    // message caps its caption at 1024 characters, which a real bug report
    // plus the account block exceeds routinely, and Telegram rejects the whole
    // send rather than trimming it.
    for (const fileId of ticket.screenshots) {
      await sendPhoto(adminId, fileId, `📎 ${escapeHtml(ticket.ticketNumber)}`);
    }

    return true;
  });

  logInfo("ticket_notified", {
    ticket: ticket.ticketNumber,
    delivered,
    admins: supportAdminIds().length,
  });

  if (delivered === 0) {
    logWarn("ticket_undelivered", {
      ticket: ticket.ticketNumber,
      hint: "каждый админ должен один раз нажать /start у бота",
    });
  }
}

/** A user wrote again on a ticket that is already open. */
export async function notifyFollowUp(
  ticket: SupportTicketView,
  text: string,
  screenshots: readonly string[] = [],
): Promise<void> {
  if (hasNoAdmins()) return;

  const card = followUpCard(ticket, text);

  await fanOut(async (adminId) => {
    const sent = await sendMessage(adminId, card, ticketActionsKeyboard(ticket.id));
    if (!sent) return false;

    for (const fileId of screenshots) {
      await sendPhoto(adminId, fileId, `📎 ${escapeHtml(ticket.ticketNumber)}`);
    }

    return true;
  });
}

/**
 * Tell the rest of the team what one admin just did.
 *
 * Without this, two people answering the queue at the same time both see a NEW
 * ticket and both write a reply. The buttons on their own copies of the card
 * cannot be edited from here — each admin got a different message in a
 * different chat — so a short line is what keeps the roster in sync.
 */
export async function notifyAdmins(text: string, exceptTelegramId?: string): Promise<void> {
  await fanOut(async (adminId) => {
    if (adminId === exceptTelegramId) return false;
    return Boolean(await sendMessage(adminId, text));
  });
}
