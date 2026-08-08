/**
 * Structured logging for the bot, on one prefix.
 *
 * A webhook has no UI to surface a failure in: if a sendMessage fails, the
 * only place anyone will ever find out is the server log, so this module is
 * the module's entire error-reporting surface. One prefix, so the whole bot
 * can be filtered out of a noisy log with a single grep.
 *
 * Deliberately console-based. The app has no logging library, and introducing
 * one for this feature would be a dependency the rest of the codebase does not
 * share.
 */

const PREFIX = "[support-bot]";

type LogFields = Record<string, string | number | boolean | null | undefined>;

function line(fields: LogFields | undefined): string {
  if (!fields) return "";
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function logInfo(event: string, fields?: LogFields): void {
  console.info(`${PREFIX} ${event}${line(fields)}`);
}

export function logWarn(event: string, fields?: LogFields): void {
  console.warn(`${PREFIX} ${event}${line(fields)}`);
}

/**
 * An error, with the cause reduced to a message.
 *
 * The raw error is not spread into the log: a failed Telegram call carries the
 * request it failed on, and that request can contain a user's problem
 * description or the bot token in a URL. The message alone is what is safe to
 * write down.
 */
export function logError(event: string, error: unknown, fields?: LogFields): void {
  const reason = error instanceof Error ? error.message : String(error);
  console.error(`${PREFIX} ${event} reason=${JSON.stringify(reason)}${line(fields)}`);
}
