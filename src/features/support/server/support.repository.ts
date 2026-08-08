import "server-only";
import { db } from "@/server/db";
import { PLANS } from "@/features/settings/schemas";
import { resolvePlan } from "@/features/settings/lib/plan-status";
import type { PlanId } from "@/features/settings/types";
import { MAX_OPEN_TICKETS_PER_USER, TICKETS_PAGE_SIZE } from "../constants";
import { formatTicketNumber } from "../lib/ticket-number";
import { parseCategory, parseScreenshots, parseStatus, serializeScreenshots } from "../schemas";
import type {
  SupportCategoryId,
  SupportMessageAuthor,
  SupportStats,
  SupportTicketAccount,
  SupportTicketStatus,
  SupportTicketView,
} from "../types";

/**
 * Every query the support bot makes.
 *
 * The handlers never touch `db` directly — same split every other feature's
 * server folder uses, and it earns its keep here
 * specifically: a webhook handler is already juggling Telegram's API, so
 * keeping the database out of it leaves one kind of failure per file.
 */

/** Statuses that still need a human. Everything except CLOSED. */
const OPEN_STATUSES: readonly SupportTicketStatus[] = ["NEW", "IN_PROGRESS", "ANSWERED"];

/** The row shape every mapper below consumes. */
interface TicketRow {
  id: number;
  ticketNumber: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  category: string;
  message: string;
  screenshots: string;
  status: string;
  assignedTo: string | null;
  createdAt: Date;
}

function toView(row: TicketRow, account: SupportTicketAccount | null): SupportTicketView {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    telegramId: row.telegramId,
    username: row.username,
    firstName: row.firstName,
    // A category that no longer exists still has to render; parseCategory
    // returning null resolves to the catch-all rather than dropping the row.
    category: parseCategory(row.category) ?? "human",
    message: row.message,
    screenshots: parseScreenshots(row.screenshots),
    status: parseStatus(row.status),
    assignedTo: row.assignedTo,
    createdAt: row.createdAt,
    account,
  };
}

/**
 * A stored plan string, narrowed to the union.
 *
 * The column is a String (SQLite, no enums) and the settings row may not exist
 * at all, so "free" is the answer to both "never chosen" and "value this build
 * does not recognise" — the same degrade-to-default rule the settings module
 * applies to its own categorical columns.
 */
function toPlanId(raw: string | undefined): PlanId {
  const plans: readonly string[] = PLANS;
  return raw !== undefined && plans.includes(raw) ? (raw as PlanId) : "free";
}

/**
 * The NOVA account behind a Telegram id, if there is one.
 *
 * Read through resolvePlan rather than off the column, so a card never shows
 * PLUS for a subscription that lapsed last week — the same on-read expiry the
 * settings screen and the AI limiter apply.
 */
async function loadAccount(telegramId: string): Promise<{
  userId: string | null;
  account: SupportTicketAccount | null;
}> {
  const user = await db.user.findUnique({
    where: { telegramId },
    select: {
      id: true,
      createdAt: true,
      onboardingCompletedAt: true,
      settings: { select: { plan: true, planUntil: true } },
    },
  });

  if (!user) return { userId: null, account: null };

  return {
    userId: user.id,
    account: {
      plan: resolvePlan(toPlanId(user.settings?.plan), user.settings?.planUntil ?? null),
      onboardingCompleted: user.onboardingCompletedAt !== null,
      registeredAt: user.createdAt,
    },
  };
}

/* ------------------------------------------------------------- writes --- */

export interface CreateTicketInput {
  telegramId: string;
  username: string | null;
  firstName: string;
  category: SupportCategoryId;
  message: string;
  screenshots: readonly string[];
}

/**
 * Open a ticket.
 *
 * Two steps rather than one, because the ticket number is derived from the id
 * the database assigns: the row is inserted with a placeholder and immediately
 * updated with its real number. The alternative — a counter table read inside
 * a transaction — buys a single write at the cost of a lock on every ticket
 * creation, and the placeholder is never observable: nothing reads the row
 * between the two statements, and both run inside one transaction so a crash
 * between them cannot leave a ticket named "pending".
 */
export async function createTicket(input: CreateTicketInput): Promise<SupportTicketView> {
  const { userId, account } = await loadAccount(input.telegramId);

  const row = await db.$transaction(async (tx) => {
    const created = await tx.supportTicket.create({
      data: {
        ticketNumber: "",
        userId,
        telegramId: input.telegramId,
        username: input.username,
        firstName: input.firstName,
        category: input.category,
        message: input.message,
        screenshots: serializeScreenshots(input.screenshots),
        status: "NEW",
      },
      select: { id: true },
    });

    return tx.supportTicket.update({
      where: { id: created.id },
      data: { ticketNumber: formatTicketNumber(created.id) },
    });
  });

  return toView(row, account);
}

export async function addTicketMessage(
  ticketId: number,
  author: SupportMessageAuthor,
  authorTelegramId: string,
  text: string,
): Promise<void> {
  await db.supportMessage.create({
    data: { ticketId, author, authorTelegramId, text },
  });
}

/**
 * Move a ticket to a new status.
 *
 * closedAt is written only on the transition into CLOSED and cleared on any
 * transition out of it, so "closed at" can never describe a ticket that is
 * open — the pair is one fact, not two columns that happen to agree.
 */
export async function setTicketStatus(
  ticketId: number,
  status: SupportTicketStatus,
  assignedTo?: string,
): Promise<SupportTicketView | null> {
  const row = await db.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      closedAt: status === "CLOSED" ? new Date() : null,
      ...(assignedTo === undefined ? {} : { assignedTo }),
    },
  });

  const { account } = await loadAccount(row.telegramId);
  return toView(row, account);
}

/* -------------------------------------------------------------- reads --- */

export async function findTicketById(ticketId: number): Promise<SupportTicketView | null> {
  const row = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!row) return null;

  const { account } = await loadAccount(row.telegramId);
  return toView(row, account);
}

/**
 * The ticket a user's next message belongs to.
 *
 * Newest open ticket wins. Someone who writes again after being answered is
 * continuing that conversation, not starting a parallel one — which is why a
 * follow-up appends here instead of opening a second ticket about the same
 * problem.
 */
export async function findLatestOpenTicket(telegramId: string): Promise<SupportTicketView | null> {
  const row = await db.supportTicket.findFirst({
    where: { telegramId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;

  const { account } = await loadAccount(row.telegramId);
  return toView(row, account);
}

/** How close this user is to MAX_OPEN_TICKETS_PER_USER. */
export async function countOpenTickets(telegramId: string): Promise<number> {
  return db.supportTicket.count({
    where: { telegramId, status: { in: [...OPEN_STATUSES] } },
  });
}

export async function hasTooManyOpenTickets(telegramId: string): Promise<boolean> {
  return (await countOpenTickets(telegramId)) >= MAX_OPEN_TICKETS_PER_USER;
}

export interface OpenTicketsPage {
  tickets: readonly SupportTicketView[];
  total: number;
}

/**
 * The queue behind /tickets: oldest first.
 *
 * Oldest rather than newest, unlike every other list in this file — a queue is
 * read to find what has been waiting longest, and sorting it like a feed is
 * how the ticket at the bottom stays there.
 */
export async function listOpenTickets(limit = TICKETS_PAGE_SIZE): Promise<OpenTicketsPage> {
  const where = { status: { in: [...OPEN_STATUSES] } };

  const [rows, total] = await Promise.all([
    db.supportTicket.findMany({ where, orderBy: { createdAt: "asc" }, take: limit }),
    db.supportTicket.count({ where }),
  ]);

  return { tickets: rows.map((row) => toView(row, null)), total };
}

/**
 * Counts for /stats.
 *
 * groupBy rather than four counts: one round trip, and a status this build
 * does not know about still shows up in the total instead of vanishing from
 * a hardcoded list of four.
 */
export async function getSupportStats(): Promise<SupportStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [grouped, total, last24h] = await Promise.all([
    db.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    db.supportTicket.count(),
    db.supportTicket.count({ where: { createdAt: { gte: since } } }),
  ]);

  const byStatus: Record<SupportTicketStatus, number> = {
    NEW: 0,
    IN_PROGRESS: 0,
    ANSWERED: 0,
    CLOSED: 0,
  };

  for (const group of grouped) {
    byStatus[parseStatus(group.status)] += group._count._all;
  }

  return { total, byStatus, last24h };
}
