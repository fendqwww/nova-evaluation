"use client";

import { ChevronRight, History } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { MONTH_NOMINATIVE, formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { categoryOption } from "@/features/workouts/lib/categories";
import { sessionStats } from "@/features/workouts/lib/stats";
import { sortSessionsDesc } from "@/features/workouts/lib/collection";
import { formatVolume, sessionsWord, setsWord } from "@/features/workouts/lib/format";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";

/**
 * Every session, newest first, grouped by month.
 *
 * Grouped rather than flat because a training log is read as "как прошёл март",
 * and a flat list of forty dated rows makes that question take scrolling to
 * answer. The month heading carries the count and the tonnage, so the summary
 * is the thing you land on and the rows are the detail underneath it.
 *
 * Unfinished sessions are shown, not hidden. A workout started and abandoned is
 * part of the record — and it is the row a user most wants to tap, either to
 * finish it or to delete it.
 */
export function WorkoutHistoryList({
  workouts,
  sessions,
  today,
  onOpenSession,
}: {
  workouts: WorkoutItem[];
  sessions: WorkoutSessionItem[];
  today: CalendarDay;
  onOpenSession: (sessionId: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        className="py-10"
        icon={<History className="h-5 w-5" />}
        title="Тренировок пока нет"
        description="Каждая завершённая тренировка останется здесь — с подходами, весом и объёмом."
      />
    );
  }

  const byId = new Map(workouts.map((workout) => [workout.id, workout]));
  const ordered = sortSessionsDesc(sessions);

  const months = new Map<string, WorkoutSessionItem[]>();
  for (const session of ordered) {
    const key = session.day.slice(0, 7);
    const bucket = months.get(key);
    if (bucket) bucket.push(session);
    else months.set(key, [session]);
  }

  return (
    <div className="flex flex-col gap-4">
      {[...months.entries()].map(([month, items]) => {
        const [year, monthIndex] = month.split("-").map(Number);
        const completed = items.filter((session) => session.completedAt !== null);
        const volume = completed.reduce(
          (total, session) => total + sessionStats(session, byId.get(session.workoutId)).volumeKg,
          0,
        );

        return (
          <div key={month} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-section text-muted-foreground">
                {MONTH_NOMINATIVE[monthIndex - 1]}
                {String(year) !== today.slice(0, 4) && ` ${year}`}
              </span>
              <span className="numeric text-[0.6875rem] text-subtle-foreground">
                {completed.length} {sessionsWord(completed.length)}
                {volume > 0 && ` · ${formatVolume(volume)}`}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {items.map((session) => {
                const workout = byId.get(session.workoutId);
                const stats = sessionStats(session, workout);
                const category = categoryOption(workout?.category ?? "other");
                const CategoryIcon = category.icon;
                const isOpen = session.completedAt === null;

                return (
                  <Card key={session.id} elevation="raised" className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onOpenSession(session.id)}
                      className="press-sm flex w-full items-center gap-2.5 p-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.625rem] ring-1 ring-inset ring-fill-muted",
                          isOpen
                            ? "bg-accent-muted text-accent"
                            : "bg-tint-green-muted text-tint-green",
                        )}
                      >
                        <CategoryIcon className="h-4 w-4" />
                      </span>

                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-caption font-semibold text-foreground">
                          {workout?.title ?? "Тренировка"}
                        </span>
                        <span className="numeric text-[0.6875rem] text-subtle-foreground">
                          {formatDay(session.day, today)}
                          {isOpen
                            ? " · не завершена"
                            : stats.setsDone > 0
                              ? ` · ${stats.setsDone} ${setsWord(stats.setsDone)}`
                              : " · без подходов"}
                        </span>
                      </span>

                      {stats.volumeKg > 0 && (
                        <span className="numeric shrink-0 text-caption font-semibold text-foreground">
                          {formatVolume(stats.volumeKg)}
                        </span>
                      )}

                      <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
