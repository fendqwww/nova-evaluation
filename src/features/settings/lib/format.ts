import { dayToDate, type CalendarDay } from "@/shared/lib/calendar-day";
import type { DateFormat, UnitSystem } from "@/features/settings/types";

/**
 * A day written in the user's chosen format.
 *
 * Deliberately *not* a replacement for formatDay in shared/lib/calendar-day —
 * that one writes "15 августа", which is the right register for a card and is
 * already used across five sections. This is for the places a numeric date is
 * the point (an export, a settings preview), and it exists so the dateFormat
 * setting has a single implementation rather than one per call site.
 *
 * Always formatted with timeZone: "UTC", the same rule every other day
 * formatter in the app follows: a CalendarDay is a calendar day, and letting
 * the local zone shift it would show a different day than the one stored.
 */
const NUMERIC_PARTS = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
} as const;

const dmy = new Intl.DateTimeFormat("ru-RU", NUMERIC_PARTS);
const mdy = new Intl.DateTimeFormat("en-US", NUMERIC_PARTS);

export function formatDayNumeric(day: CalendarDay, format: DateFormat): string {
  if (format === "iso") return day;
  const date = dayToDate(day);
  return format === "mdy" ? mdy.format(date) : dmy.format(date);
}

/** "2 августа 2026, 14:35" — an instant, for the archive and the export card. */
const instantFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatInstant(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return instantFormat.format(date);
}

/**
 * Weight for display.
 *
 * Storage stays metric whatever the setting says — Profile.weightKg is
 * kilograms, WorkoutSet.weightKg is kilograms — so this converts at the edge
 * and nothing upstream has to know which system is selected. That is the whole
 * reason unitSystem is a display setting rather than a storage one: switching
 * it can never rewrite a column, so it can never corrupt a training log.
 */
const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;

export function formatWeight(kg: number, system: UnitSystem): string {
  if (system === "imperial") return `${Math.round(kg * LB_PER_KG)} фнт`;
  return `${Math.round(kg)} кг`;
}

/** Height: centimetres, or feet-and-inches as one string ("5'11\""). */
export function formatHeight(cm: number, system: UnitSystem): string {
  if (system !== "imperial") return `${Math.round(cm)} см`;

  const totalInches = Math.round(cm / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}′ ${inches}″`;
}

/** Bytes as "12 КБ" / "1,4 МБ" — the size hint before an export downloads. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}
