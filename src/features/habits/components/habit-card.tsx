"use client";

import { motion } from "framer-motion";
import { Archive, Check, ChevronRight, Flame } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { HabitWeekStrip } from "@/features/habits/components/habit-week-strip";
import { scheduleSummary } from "@/features/habits/lib/schedule";
import { habitStats, streakUnitNoun } from "@/features/habits/lib/stats";
import {
  adherenceTextClass,
  habitTone,
  streakBadgeClass,
  tickClass,
} from "@/features/habits/lib/tone";
import type { HabitItem } from "@/features/habits/types";

/**
 * A habit as a running record, not a checkbox: the streak is the headline
 * number, the week is visible and tappable, and adherence sits beside it so a
 * long streak on a thin schedule cannot masquerade as consistency.
 *
 * The today-tick and the body are siblings, never nested — a button inside a
 * button is invalid HTML and the inner one stops receiving taps in some
 * engines. Ticking today and opening the habit are two separate targets, and
 * the week strip underneath is a third.
 */
export function HabitCard({
  habit,
  today,
  windowStart,
  onToggleDay,
  onOpen,
}: {
  habit: HabitItem;
  today: CalendarDay;
  windowStart: CalendarDay;
  onToggleDay: (day: CalendarDay, isDone: boolean) => void;
  onOpen: () => void;
}) {
  const stats = habitStats(habit, today, windowStart);
  const isArchived = habit.archivedAt !== null;
  const tone = habitTone(stats, isArchived);
  const adherencePercent = Math.round(stats.adherence * 100);

  return (
    <Card
      elevation={isArchived ? "inset" : "raised"}
      className="overflow-hidden transition-colors duration-200"
    >
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-start gap-2.5">
          {isArchived ? (
            <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-subtle-foreground">
              <Archive className="h-3.5 w-3.5" />
            </span>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => onToggleDay(today, !stats.isDoneToday)}
              role="checkbox"
              aria-checked={stats.isDoneToday}
              aria-label={stats.isDoneToday ? "Снять отметку за сегодня" : "Отметить сегодня"}
              className={cn(
                "mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                tickClass(tone),
              )}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </motion.button>
          )}

          <button
            type="button"
            onClick={onOpen}
            className="press-sm flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-[1.0625rem] font-semibold leading-snug tracking-[-0.018em]",
                  isArchived ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {habit.title}
              </span>
              <span className="text-caption text-subtle-foreground">
                {scheduleSummary(habit.schedule)}
                {!stats.isDueToday && !stats.isDoneToday && !isArchived && " · сегодня отдых"}
              </span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-subtle-foreground" />
          </button>
        </div>

        {/* The streak is the loudest thing on the card by design — it is the
            number a habit exists to grow, set at metric scale rather than in
            caption text. Adherence sits opposite it as the honest counterweight. */}
        <button
          type="button"
          onClick={onOpen}
          className="press-sm flex items-end justify-between gap-3 text-left"
        >
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "numeric text-[2rem] font-bold leading-none tracking-[-0.045em]",
                stats.currentStreak > 0 && !isArchived ? "text-foreground" : "text-subtle-foreground",
              )}
            >
              {stats.currentStreak}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-caption text-muted-foreground">
                {streakUnitNoun(stats.currentStreak, stats.streakUnit)} подряд
              </span>
              {stats.currentStreak > 0 && !isArchived && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
                    streakBadgeClass(stats.currentStreak),
                  )}
                >
                  <Flame className="h-3 w-3" />
                </span>
              )}
            </span>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="numeric text-caption font-semibold text-foreground">
              {stats.week.done} из {stats.week.target}{" "}
              {pluralizeRu(stats.week.target, ["раз", "раза", "раз"])}
            </span>
            <span className={cn("numeric text-[0.75rem]", adherenceTextClass(stats.adherence))}>
              {adherencePercent}% за месяц
            </span>
          </div>
        </button>

        <div className="border-t border-border pt-3">
          <HabitWeekStrip
            habit={habit}
            today={today}
            onToggle={onToggleDay}
            disabled={isArchived}
          />
        </div>
      </div>
    </Card>
  );
}
