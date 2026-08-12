"use client";

import { Flame } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import {
  careStreak,
  daysWord,
  doneOn,
  remainingOn,
  routinesWord,
} from "@/features/appearance/lib/stats";
import type { CareRoutineItem } from "@/features/appearance/types";

/**
 * The day in one glance: how much of what was due is finished.
 *
 * The ring counts *due* routines rather than all of them, which is the only
 * honest denominator — a weekday-only routine owes nothing on Sunday, and
 * dividing by everything the user has ever created would make a perfectly kept
 * Sunday read as 40%.
 */
export function CareSummaryCard({
  routines,
  day,
  today,
  windowStart,
}: {
  routines: CareRoutineItem[];
  day: CalendarDay;
  today: CalendarDay;
  windowStart: CalendarDay;
}) {
  const active = routines.filter((routine) => routine.archivedAt === null);
  const remaining = remainingOn(active, day);
  const doneToday = active.filter((routine) => doneOn(routine, day));

  // Due = what is still owed plus what has already been done, so finishing a
  // routine moves the numerator without shrinking the denominator under it.
  const due = remaining.length + doneToday.length;
  const percent = due === 0 ? 0 : Math.round((doneToday.length / due) * 100);
  const streak = careStreak(active, today, windowStart);

  return (
    <Card elevation="lifted">
      <div className="flex items-center gap-4 p-4">
        <CircularProgress value={percent} size={84} strokeWidth={7}>
          <div className="flex flex-col items-center">
            <span className="numeric text-metric-sm font-bold leading-none text-foreground">
              {doneToday.length}
            </span>
            <span className="numeric text-micro leading-tight text-subtle-foreground">
              из {due}
            </span>
          </div>
        </CircularProgress>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-body font-medium text-foreground">
            {due === 0
              ? "На этот день ничего не запланировано"
              : remaining.length === 0
                ? "Весь уход на сегодня закрыт"
                : `Осталось ${remaining.length} ${routinesWord(remaining.length)}`}
          </p>

          {remaining.length > 0 && (
            <p className="truncate text-caption text-muted-foreground">
              {remaining.map((routine) => routine.title).join(", ")}
            </p>
          )}

          {streak > 0 && (
            <span className="flex items-center gap-1.5 text-caption text-tint-orange">
              <Flame className="h-3.5 w-3.5" />
              {streak} {daysWord(streak)} подряд без пропусков
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
