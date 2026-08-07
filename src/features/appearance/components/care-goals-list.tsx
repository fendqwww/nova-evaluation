"use client";

import { motion } from "framer-motion";
import { Check, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import { diffDays, formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { areaLabel } from "@/features/appearance/lib/areas";
import { AREA_ICONS } from "@/features/appearance/lib/icons";
import { formatPercent } from "@/features/appearance/lib/format";
import { daysWord, rangeStats } from "@/features/appearance/lib/stats";
import { adherenceTextClass } from "@/features/appearance/lib/tone";
import type { CareGoalItem, CareRoutineItem } from "@/features/appearance/types";

/**
 * Goals about how the user wants to look, with the care that backs them.
 *
 * A goal here has no checklist of its own — the routines in the same area *are*
 * the work — so instead of a fake percentage this shows the real adherence of
 * those routines over the last month. That number is derived on the spot from
 * the logs, so it is the same figure the stats card reports and it moves the
 * moment a routine is ticked.
 */
export function CareGoalsList({
  goals,
  routines,
  today,
  windowStart,
  onCreate,
  onEdit,
  onToggleCompleted,
  onDelete,
}: {
  goals: CareGoalItem[];
  routines: CareRoutineItem[];
  today: CalendarDay;
  windowStart: CalendarDay;
  onCreate: () => void;
  onEdit: (goal: CareGoalItem) => void;
  onToggleCompleted: (goalId: string, isCompleted: boolean) => void;
  onDelete: (goalId: string) => void;
}) {
  if (goals.length === 0) {
    return (
      <EmptyState
        className="py-8"
        icon={<Target className="h-5 w-5" />}
        title="Направление не задано"
        description="Цель задаёт направление, процедуры — путь к ней. Начни с цели."
        action={
          <Button size="lg" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Добавить цель
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Button variant="secondary" className="w-full" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Новая цель
      </Button>

      {goals.map((goal) => {
        const Icon = AREA_ICONS[goal.area];
        const supporting = routines.filter(
          (routine) => routine.area === goal.area && routine.archivedAt === null,
        );
        // Scored from the goal's own start day, never earlier — a goal set today
        // is not judged on a month that happened before it existed.
        const from =
          diffDays(windowStart, goal.createdDay) >= 0 ? goal.createdDay : windowStart;
        const stats = rangeStats(supporting, from, today);
        const daysLeft = goal.targetDate ? diffDays(today, goal.targetDate) : null;

        return (
          <Card key={goal.id} elevation={goal.isCompleted ? "accent" : "raised"}>
            <div className="flex flex-col gap-3 p-3.5">
              <div className="flex items-start gap-3">
                <IconChip tone={goal.isCompleted ? "score" : "goal"} size="md">
                  <Icon className="h-4 w-4" />
                </IconChip>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p
                    className={cn(
                      "truncate text-body font-medium",
                      goal.isCompleted
                        ? "text-subtle-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {goal.title}
                  </p>
                  <p className="truncate text-caption text-muted-foreground">
                    {areaLabel(goal.area)}
                    {goal.targetDate && ` · до ${formatDay(goal.targetDate, today)}`}
                  </p>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onToggleCompleted(goal.id, !goal.isCompleted)}
                  role="checkbox"
                  aria-checked={goal.isCompleted}
                  aria-label={goal.isCompleted ? "Вернуть в работу" : "Цель достигнута"}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                    goal.isCompleted
                      ? "border-positive bg-positive text-background"
                      : "border-border-strong text-muted-foreground active:border-accent",
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </motion.button>
              </div>

              {goal.note && (
                <p className="text-caption text-muted-foreground">{goal.note}</p>
              )}

              {!goal.isCompleted && (
                <div className="flex items-center justify-between gap-2 text-caption">
                  <span className="text-subtle-foreground">
                    {supporting.length === 0
                      ? "Нет процедур в этой зоне"
                      : stats.expected === 0
                        ? "Ещё нечего измерять"
                        : `Уход в зоне: ${formatPercent(stats.adherence)}`}
                  </span>
                  {daysLeft !== null && (
                    <span
                      className={cn(
                        "numeric shrink-0",
                        daysLeft < 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {daysLeft < 0
                        ? `просрочено на ${Math.abs(daysLeft)} ${daysWord(Math.abs(daysLeft))}`
                        : `${daysLeft} ${daysWord(daysLeft)}`}
                    </span>
                  )}
                </div>
              )}

              {!goal.isCompleted && supporting.length > 0 && stats.expected > 0 && (
                <div className="h-1 overflow-hidden rounded-full bg-white/6">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      stats.adherence >= 0.8 ? "bg-positive" : "bg-accent",
                    )}
                    style={{ width: `${Math.round(stats.adherence * 100)}%` }}
                  />
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(goal)}
                  aria-label={`Изменить: ${goal.title}`}
                  className="rounded-lg p-1.5 text-subtle-foreground transition-colors duration-200 active:bg-white/6"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(goal.id)}
                  aria-label={`Удалить: ${goal.title}`}
                  className="rounded-lg p-1.5 text-subtle-foreground transition-colors duration-200 active:bg-white/6 active:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {stats.expected > 0 && (
                  <span
                    className={cn(
                      "numeric ml-auto text-[0.6875rem]",
                      adherenceTextClass(stats.adherence),
                    )}
                  >
                    {stats.done} / {stats.expected}
                  </span>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
