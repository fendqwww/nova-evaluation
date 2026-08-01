import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { formatDay as formatDayShared, type CalendarDay } from "@/shared/lib/calendar-day";

/**
 * Display helpers for the section.
 *
 * formatDay is re-exported rather than reimplemented so a photo's date and a
 * habit's date are formatted by the same Intl instance — two formatters would
 * be two chances for "15 августа" and "15 авг." to appear on the same screen.
 */
export function formatDay(day: CalendarDay, today: CalendarDay): string {
  return formatDayShared(day, today);
}

/** "3 месяца" / "12 дней" — the gap between two progress photos. */
export function pluralizeDaysApart(days: number): string {
  if (days >= 365) {
    const years = Math.round(days / 365);
    return `${years} ${pluralizeRu(years, ["год", "года", "лет"])}`;
  }
  if (days >= 60) {
    const months = Math.round(days / 30);
    return `${months} ${pluralizeRu(months, ["месяц", "месяца", "месяцев"])}`;
  }
  if (days >= 14) {
    const weeks = Math.round(days / 7);
    return `${weeks} ${pluralizeRu(weeks, ["неделя", "недели", "недель"])}`;
  }
  return `${days} ${pluralizeRu(days, ["день", "дня", "дней"])}`;
}

/** "68%" — an adherence ratio as the UI always writes it. */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
