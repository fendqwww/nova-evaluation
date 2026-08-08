/**
 * The human-facing name of a ticket: NOVA-000001.
 *
 * Derived from the row's autoincrementing id (see SupportTicket in
 * schema.prisma) and stored on the row, not recomputed on read. Storing it
 * means the number a user was told in chat can never drift from the number in
 * the database — including if the id strategy is ever replaced, which is the
 * one change that would silently renumber every past conversation.
 */

const PREFIX = "NOVA-";
const DIGITS = 6;

export function formatTicketNumber(id: number): string {
  return `${PREFIX}${String(id).padStart(DIGITS, "0")}`;
}

/**
 * The id behind a ticket number, or null if the string is not one.
 *
 * Used by the admin commands, which take a number the way support quotes it
 * ("/close NOVA-000042"). The prefix is optional and the case is ignored,
 * because a support engineer typing "/close 42" on a phone means exactly the
 * same thing and should not be told otherwise.
 */
export function parseTicketNumber(raw: string): number | null {
  const trimmed = raw.trim().toUpperCase();
  const digits = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;

  if (!/^\d+$/.test(digits)) return null;

  const id = Number.parseInt(digits, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
