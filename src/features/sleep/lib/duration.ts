/**
 * Bedtime/wake-time arithmetic, shared by the client (live preview in the log
 * form) and the server (the authoritative durationMin written to the row).
 */

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Minutes asleep between a bedtime and a wake time.
 *
 * A bedtime later in the clock than the wake time is assumed to be the
 * previous evening (23:30 → 07:00 wraps past midnight); a bedtime earlier
 * than or equal to the wake time is assumed to be the same night, after
 * midnight (00:30 → 07:00 needs no wrap). Either way the result is what a
 * sleep tracker means by "hours asleep", not a literal clock subtraction.
 */
export function minutesBetween(bedTime: string, wakeTime: string): number {
  const bed = toMinutes(bedTime);
  const wake = toMinutes(wakeTime);
  return bed > wake ? 1440 - bed + wake : wake - bed;
}

/** "7 ч 32 мин", or "32 мин" under an hour. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

/** "7,5" — hours as one decimal, for a chart axis or a compact stat. */
export function hoursDecimal(minutes: number): string {
  return (Math.round((minutes / 60) * 10) / 10).toString().replace(".", ",");
}
