/**
 * Window sizes shared by the server aggregate and the chart that draws it.
 *
 * They live here rather than in profile.repository.ts because that module is
 * `server-only` — a client component importing a constant from it would pull
 * the whole repository (and Prisma) into the browser bundle, which is exactly
 * what the marker exists to prevent.
 */

/**
 * How far back the activity series and the streak look.
 *
 * A year: long enough that a streak claim means something, short enough that
 * the day-bucketing stays a bounded number of small rows. A streak longer than
 * this is clipped — a real problem the day somebody manages it, and not before.
 */
export const ACTIVITY_WINDOW_DAYS = 365;

/** How many of those days the chart actually renders. */
export const ACTIVITY_CHART_DAYS = 30;
