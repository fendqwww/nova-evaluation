import "server-only";
import { db } from "@/server/db";
import { MAX_SCREENSHOTS, RATE_LIMIT } from "../constants";
import { parseCategory, parseScreenshots, parseStep, serializeScreenshots } from "../schemas";
import type { SupportCategoryId, SupportSessionStep } from "../types";

/**
 * Where each Telegram conversation currently is.
 *
 * The whole reason this is a table and not a Map is in the note on
 * SupportSession in schema.prisma: a webhook handler starts with no memory of
 * the previous update, so "what does this message mean?" has to be answerable
 * from storage alone.
 *
 * Every write is an upsert keyed on telegramId. No handler ever has to check
 * whether a session exists first, which removes the read-then-write race that
 * two updates arriving together would otherwise lose a screenshot to.
 */

export interface SupportSessionState {
  telegramId: string;
  step: SupportSessionStep;
  draftCategory: SupportCategoryId | null;
  draftMessage: string | null;
  draftScreenshots: readonly string[];
  activeTicketId: number | null;
}

const IDLE: Omit<SupportSessionState, "telegramId"> = {
  step: "idle",
  draftCategory: null,
  draftMessage: null,
  draftScreenshots: [],
  activeTicketId: null,
};

export async function getSession(telegramId: string): Promise<SupportSessionState> {
  const row = await db.supportSession.findUnique({ where: { telegramId } });

  // No row is not an error state — it is a conversation that has not started.
  if (!row) return { telegramId, ...IDLE };

  return {
    telegramId,
    step: parseStep(row.step),
    draftCategory: parseCategory(row.draftCategory),
    draftMessage: row.draftMessage,
    draftScreenshots: parseScreenshots(row.draftScreenshots),
    activeTicketId: row.activeTicketId,
  };
}

/** Begin a ticket: category chosen, waiting for the description. */
export async function startDraft(
  telegramId: string,
  category: SupportCategoryId,
): Promise<void> {
  await db.supportSession.upsert({
    where: { telegramId },
    create: {
      telegramId,
      step: "awaiting_message",
      draftCategory: category,
      draftScreenshots: "[]",
    },
    update: {
      step: "awaiting_message",
      draftCategory: category,
      // A new draft starts empty even if the previous one was abandoned
      // half-written. Carrying a stale description into a different category
      // is the one way this flow could put words in a user's mouth.
      draftMessage: null,
      draftScreenshots: "[]",
      activeTicketId: null,
    },
  });
}

/** Description captured; the flow moves on to attachments. */
export async function setDraftMessage(telegramId: string, message: string): Promise<void> {
  await db.supportSession.upsert({
    where: { telegramId },
    create: {
      telegramId,
      step: "awaiting_screenshot",
      draftMessage: message,
    },
    update: {
      step: "awaiting_screenshot",
      draftMessage: message,
    },
  });
}

/**
 * Attach a screenshot, capped at MAX_SCREENSHOTS.
 *
 * Returns the new count so the caller can tell the user where they are without
 * a second read. At the cap the extra file is dropped silently rather than
 * rejected loudly — someone sending an album of eight is not doing anything
 * wrong, and five screenshots is already more than any ticket needs.
 */
export async function addDraftScreenshot(telegramId: string, fileId: string): Promise<number> {
  const session = await getSession(telegramId);

  if (session.draftScreenshots.length >= MAX_SCREENSHOTS) {
    return session.draftScreenshots.length;
  }

  const next = [...session.draftScreenshots, fileId];

  await db.supportSession.upsert({
    where: { telegramId },
    create: {
      telegramId,
      step: "awaiting_screenshot",
      draftScreenshots: serializeScreenshots(next),
    },
    update: { draftScreenshots: serializeScreenshots(next) },
  });

  return next.length;
}

/**
 * Put an admin into "the next message you send is the reply".
 *
 * Same table as the user flow, because it is the same question — see the note
 * on SupportSession in schema.prisma.
 */
export async function startReply(telegramId: string, ticketId: number): Promise<void> {
  await db.supportSession.upsert({
    where: { telegramId },
    create: { telegramId, step: "awaiting_reply", activeTicketId: ticketId },
    update: { step: "awaiting_reply", activeTicketId: ticketId, draftCategory: null },
  });
}

/**
 * Back to idle, draft discarded.
 *
 * The row is kept rather than deleted: it also holds the rate-limit window,
 * and deleting it would hand anyone a free reset of their own flood counter by
 * simply sending /cancel.
 */
export async function resetSession(telegramId: string): Promise<void> {
  await db.supportSession.upsert({
    where: { telegramId },
    create: { telegramId, step: "idle" },
    update: {
      step: "idle",
      draftCategory: null,
      draftMessage: null,
      draftScreenshots: "[]",
      activeTicketId: null,
    },
  });
}

/* --------------------------------------------------------- rate limit --- */

export interface RateLimitVerdict {
  allowed: boolean;
  /** Set when the chat is inside a cooldown. */
  blockedUntil: Date | null;
  /** True only on the update that *caused* the block, so it is announced once. */
  justBlocked: boolean;
}

/**
 * Count this update against the chat's window, and say whether to serve it.
 *
 * Called once per incoming update, before any handler runs, so a flood costs
 * one upsert rather than a ticket. The window is fixed and resets by
 * comparison rather than by a scheduled job — a window that started longer ago
 * than RATE_LIMIT.windowMs is simply treated as a fresh one, which means
 * nothing has to run to clean up after an idle chat.
 *
 * `justBlocked` exists so the bot says "слишком много сообщений" exactly once
 * per cooldown. Repeating it on every message during a flood would make the
 * bot the loudest participant in it.
 */
export async function consumeRateLimit(telegramId: string): Promise<RateLimitVerdict> {
  const now = new Date();
  const row = await db.supportSession.findUnique({
    where: { telegramId },
    select: { windowStartedAt: true, windowCount: true, blockedUntil: true },
  });

  if (row?.blockedUntil && row.blockedUntil.getTime() > now.getTime()) {
    return { allowed: false, blockedUntil: row.blockedUntil, justBlocked: false };
  }

  const windowExpired =
    !row || now.getTime() - row.windowStartedAt.getTime() > RATE_LIMIT.windowMs;

  const windowStartedAt = windowExpired ? now : row.windowStartedAt;
  const windowCount = (windowExpired ? 0 : row.windowCount) + 1;

  if (windowCount > RATE_LIMIT.maxMessages) {
    const blockedUntil = new Date(now.getTime() + RATE_LIMIT.cooldownMs);
    await db.supportSession.upsert({
      where: { telegramId },
      create: { telegramId, windowStartedAt: now, windowCount: 0, blockedUntil },
      // The window resets along with the block: when the cooldown ends the
      // chat starts from zero rather than from an already-full counter that
      // would re-trigger on the first message back.
      update: { windowStartedAt: now, windowCount: 0, blockedUntil },
    });
    return { allowed: false, blockedUntil, justBlocked: true };
  }

  await db.supportSession.upsert({
    where: { telegramId },
    create: { telegramId, windowStartedAt, windowCount, blockedUntil: null },
    update: { windowStartedAt, windowCount, blockedUntil: null },
  });

  return { allowed: true, blockedUntil: null, justBlocked: false };
}
