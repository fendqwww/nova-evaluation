import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import {
  WEEKDAY_SHORT,
  diffDays,
  weekdayIndex,
  type CalendarDay,
} from "@/shared/lib/calendar-day";
import {
  countWeekdays,
  hasWeekday,
  toggleWeekday,
  weekdayList,
} from "@/features/habits/lib/schedule";
import { EVERY_DAY_MASK, NO_PLAN_MASK } from "@/features/workouts/schemas";

/**
 * A workout's plan: which weekdays it is owed on.
 *
 * The bitmask helpers come from features/habits/lib/schedule rather than being
 * copied: bit 0 = Monday is one convention shared by both sections, and two
 * implementations of it would be two chances for "Пн, Ср, Пт" to mean different
 * things in different screens. They are pure functions over a number with
 * nothing habit-specific about them — the habit-shaped parts of that module
 * (isScheduledOn, expectedInRange over a HabitSchedule) are deliberately not
 * used here, because a workout's plan is a different thing: mask 0 is legal and
 * means "no fixed days", which no habit schedule can express.
 */
export { countWeekdays, hasWeekday, toggleWeekday, weekdayList };

export function hasPlan(weekdayMask: number): boolean {
  return weekdayMask !== NO_PLAN_MASK;
}

/** Whether the plan asks for this workout on `day`. False without a plan. */
export function isPlannedOn(weekdayMask: number, day: CalendarDay): boolean {
  return hasPlan(weekdayMask) && hasWeekday(weekdayMask, weekdayIndex(day));
}

/**
 * How many sessions the plan asks for across an inclusive day range.
 *
 * Counted day by day rather than as (span / 7) × perWeek: over a 10-day window
 * the approximation is off by a day or two depending on where the window
 * starts, and an adherence figure that drifts with the calendar is worse than
 * one that is simply right. Same reasoning as expectedInRange for habits.
 *
 * A workout with no plan expects nothing — it is trained when it is trained,
 * and inventing a target for it would manufacture a miss out of a free week.
 */
export function plannedInRange(
  weekdayMask: number,
  from: CalendarDay,
  to: CalendarDay,
): number {
  if (!hasPlan(weekdayMask)) return 0;

  const span = diffDays(from, to) + 1;
  if (span <= 0) return 0;

  const first = weekdayIndex(from);
  let count = 0;
  for (let offset = 0; offset < span; offset += 1) {
    if (hasWeekday(weekdayMask, (first + offset) % 7)) count += 1;
  }
  return count;
}

const MASK_WORKWEEK = 0b0011111; // Mon–Fri
const MASK_WEEKEND = 0b1100000; // Sat–Sun

/** "Пн, Ср, Пт" / "Каждый день" / "Без плана" — the full form. */
export function describePlan(weekdayMask: number): string {
  if (!hasPlan(weekdayMask)) return "Без плана";
  if (weekdayMask === EVERY_DAY_MASK) return "Каждый день";
  if (weekdayMask === MASK_WORKWEEK) return "По будням";
  if (weekdayMask === MASK_WEEKEND) return "По выходным";
  return weekdayList(weekdayMask)
    .map((index) => WEEKDAY_SHORT[index])
    .join(", ");
}

/** The short form for a card's meta line — a count once the list gets long. */
export function planSummary(weekdayMask: number): string {
  if (!hasPlan(weekdayMask)) return "Без плана";
  // Checked before the count branch below, which would otherwise render every
  // day of the week as "7 раз в неделю" — true, and not what anyone calls it.
  if (weekdayMask === EVERY_DAY_MASK) return "Каждый день";
  const count = countWeekdays(weekdayMask);
  if (count >= 4 && weekdayMask !== MASK_WORKWEEK) {
    return `${count} ${pluralizeRu(count, ["раз", "раза", "раз"])} в неделю`;
  }
  return describePlan(weekdayMask);
}

export const PLAN_PRESETS: { label: string; mask: number }[] = [
  { label: "Без плана", mask: NO_PLAN_MASK },
  { label: "Пн, Ср, Пт", mask: 0b0010101 },
  { label: "По будням", mask: MASK_WORKWEEK },
  { label: "По выходным", mask: MASK_WEEKEND },
];

/**
 * Whether a day can be logged at all.
 *
 * Backdating is allowed — people do log the session they forgot on Tuesday —
 * but the future has not happened yet, so it cannot be marked done.
 */
export function isLoggable(day: CalendarDay, today: CalendarDay): boolean {
  return diffDays(day, today) >= 0;
}
