"use client";

import { BarChart3, Flame } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { diffDays, type CalendarDay } from "@/shared/lib/calendar-day";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import { WorkoutMonthCalendar } from "@/features/workouts/components/workout-month-calendar";
import { categoryOption } from "@/features/workouts/lib/categories";
import { ADHERENCE_DAYS, overallStats, type WorkoutDayState } from "@/features/workouts/lib/stats";
import { progressFillClass } from "@/features/workouts/lib/tone";
import { formatVolume, sessionsWord, setsWord } from "@/features/workouts/lib/format";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";

/**
 * The whole section's numbers, plus the calendar of everything that was done.
 *
 * Every figure is recomputed from the sessions on each render — there is no
 * stored weekly total anywhere, which is what makes correcting a set from three
 * weeks ago immediately correct here too.
 *
 * The calendar is read-only in this view on purpose. It spans every programme,
 * so a tap would have to ask *which* workout the user means, and a picker
 * hanging off a calendar cell is a worse answer than opening the programme and
 * ticking the day there.
 */
export function WorkoutsStatsCard({
  workouts,
  sessions,
  today,
  windowStart,
}: {
  workouts: WorkoutItem[];
  sessions: WorkoutSessionItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
}) {
  const stats = overallStats(workouts, sessions, today, windowStart);

  const completedByDay = new Map<CalendarDay, number>();
  for (const session of sessions) {
    if (session.completedAt === null) continue;
    completedByDay.set(session.day, (completedByDay.get(session.day) ?? 0) + 1);
  }

  if (stats.totalDone === 0) {
    return (
      <EmptyState
        className="py-10"
        icon={<BarChart3 className="h-5 w-5" />}
        title="Прогресс ещё не измерен"
        description="Заверши первую тренировку — Nova начнёт считать объём, регулярность и календарь."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card elevation="raised">
        <div className="flex flex-col gap-3.5 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="numeric text-[2rem] font-bold leading-none tracking-[-0.045em] text-foreground">
                {stats.weekDone}
              </span>
              <span className="text-caption text-muted-foreground">
                {stats.weekTarget > 0
                  ? `из ${stats.weekTarget} на этой неделе`
                  : `${sessionsWord(stats.weekDone)} на этой неделе`}
              </span>
            </div>

            {stats.weekStreak > 0 && (
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-tint-orange-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-tint-orange">
                <Flame className="h-3 w-3" />
                <span className="numeric">
                  {stats.weekStreak} {pluralizeRu(stats.weekStreak, ["неделя", "недели", "недель"])}
                </span>
              </span>
            )}
          </div>

          {stats.weekTarget > 0 && (
            <GoalProgressBar
              ratio={stats.weekRatio}
              fillClass={progressFillClass(stats.weekRatio, false)}
              size="sm"
            />
          )}

          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3.5">
            <Metric value={String(stats.monthDone)} label={`за ${ADHERENCE_DAYS} дней`} />
            <Metric value={formatVolume(stats.volumeMonthKg)} label="объём за месяц" />
            <Metric
              value={String(stats.totalSetsMonth)}
              label={`${setsWord(stats.totalSetsMonth)} за месяц`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border pt-3.5">
            <Metric value={String(stats.totalDone)} label="всего за полгода" />
            <Metric value={formatVolume(stats.volumeWeekKg)} label="объём за неделю" />
            <Metric
              value={String(stats.averagePerWeek).replace(".", ",")}
              label="в среднем в неделю"
            />
          </div>
        </div>
      </Card>

      {stats.byCategory.length > 0 && (
        <Card elevation="raised">
          <div className="flex flex-col gap-2.5 p-4">
            <p className="text-label uppercase text-subtle-foreground">
              Распределение за {ADHERENCE_DAYS} дней
            </p>
            <div className="flex flex-col gap-2">
              {stats.byCategory.map((slice) => {
                const option = categoryOption(slice.category);
                const Icon = option.icon;

                return (
                  <div key={slice.category} className="flex items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                    <span className="w-24 shrink-0 truncate text-caption text-muted-foreground">
                      {option.short}
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-fill-muted">
                      <div
                        className="h-full rounded-full bg-tint-green"
                        style={{ width: `${Math.round(slice.ratio * 100)}%` }}
                      />
                    </div>
                    <span className="numeric w-6 shrink-0 text-right text-[0.6875rem] font-semibold text-foreground">
                      {slice.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Card elevation="raised">
        <div className="flex flex-col gap-2.5 p-4">
          <p className="text-label uppercase text-subtle-foreground">
            Календарь тренировок
          </p>
          <WorkoutMonthCalendar
            today={today}
            windowStart={windowStart}
            stateOf={(day): WorkoutDayState => {
              if (completedByDay.has(day)) return "done";
              if (sessions.some((session) => session.day === day)) return "open";
              // A day that has not arrived yet is not a rest day — across every
              // programme at once there is no single plan to call it missed
              // against, but it still must not read as a settled empty day.
              return diffDays(day, today) < 0 ? "future" : "unplanned";
            }}
            countOf={(day) => completedByDay.get(day) ?? 0}
          />
        </div>
      </Card>
    </div>
  );
}

function Metric({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "numeric text-[1.125rem] font-bold leading-none tracking-[-0.03em] text-foreground",
          className,
        )}
      >
        {value}
      </span>
      <span className="text-[0.6875rem] leading-tight text-subtle-foreground">{label}</span>
    </div>
  );
}
