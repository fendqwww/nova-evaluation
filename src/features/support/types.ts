/**
 * The vocabulary of the support module.
 *
 * Every one of these unions is stored as a plain String column (SQLite has no
 * enums — see the note on SupportTicket in schema.prisma) and validated back
 * into the union by the zod schemas in ./schemas.ts on the way out of the
 * database. Nothing else in the module accepts a bare string where one of
 * these belongs.
 */

/** Which of the seven menu buttons the ticket was opened under. */
export type SupportCategoryId =
  | "app"
  | "coach"
  | "workouts"
  | "reports"
  | "billing"
  | "bug"
  | "human";

/**
 * Where a ticket is.
 *
 * NEW → IN_PROGRESS → ANSWERED → CLOSED is the expected path, but the module
 * does not enforce it as a strict machine: support can close a NEW ticket
 * outright (spam, duplicate), and a user writing again after an answer moves
 * an ANSWERED ticket back to IN_PROGRESS. What *is* enforced is that CLOSED is
 * terminal — a closed ticket is reopened by opening a new one, so the number
 * the user was given always refers to one conversation.
 */
export type SupportTicketStatus = "NEW" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";

/**
 * What the next message from a chat means.
 *
 * The bot has no other way to know: Telegram delivers a bare string with no
 * indication of which question it answers, so the meaning has to be looked up
 * from the stored step (see SupportSession in schema.prisma).
 */
export type SupportSessionStep =
  | "idle"
  | "awaiting_message"
  | "awaiting_screenshot"
  | "awaiting_reply";

/** Which side of the conversation a thread message came from. */
export type SupportMessageAuthor = "user" | "support";

/** A ticket as the admin surfaces render it. */
export interface SupportTicketView {
  id: number;
  ticketNumber: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  category: SupportCategoryId;
  message: string;
  screenshots: readonly string[];
  status: SupportTicketStatus;
  assignedTo: string | null;
  createdAt: Date;
  /** Filled only when the ticket's author is a known NOVA account. */
  account: SupportTicketAccount | null;
}

/**
 * What support can see about the account behind a ticket.
 *
 * Deliberately narrow: the plan, when they joined and whether they finished
 * onboarding are the three facts that change the answer to a support question.
 * Nothing from the health modules is exposed here — a ticket about a broken
 * button is not a reason to print someone's sleep log into a chat.
 */
export interface SupportTicketAccount {
  plan: string;
  onboardingCompleted: boolean;
  registeredAt: Date;
}

/** Counts behind /stats. */
export interface SupportStats {
  total: number;
  byStatus: Record<SupportTicketStatus, number>;
  last24h: number;
}
