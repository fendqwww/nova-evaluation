"use client";

import { motion } from "framer-motion";
import { Check, MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Card, IconChip } from "@/shared/ui/card";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { AREA_ICONS } from "@/features/appearance/lib/icons";
import { areaLabel } from "@/features/appearance/lib/areas";
import { isTickable, scheduleSummary } from "@/features/appearance/lib/schedule";
import {
  activeStepsOn,
  doneOn,
  formatStreak,
  isStepDoneOn,
  routineStats,
  stepProgressOn,
} from "@/features/appearance/lib/stats";
import {
  careTone,
  progressFillClass,
  streakBadgeClass,
  toggleButtonClass,
} from "@/features/appearance/lib/tone";
import type { CareRoutineItem } from "@/features/appearance/types";

/**
 * One routine on one day: the checklist, and the single control that finishes
 * it.
 *
 * The big circle marks the whole routine done — that is the interaction people
 * actually use for a routine they know by heart. The checklist underneath is
 * for working through it step by step, and the two agree because they write the
 * same thing: setRoutineDone ticks every step, so the circle filling in and the
 * last checkbox landing are the same event seen from two places (see
 * doneOn in lib/stats.ts, the one definition of what "done" means).
 *
 * `day` is a parameter rather than always today because backdating is
 * legitimate — people remember the evening routine they forgot to tick — and
 * the card is the same card either way.
 */
export function RoutineCard({
  routine,
  day,
  today,
  windowStart,
  onToggleRoutine,
  onToggleStep,
  onOpenMenu,
}: {
  routine: CareRoutineItem;
  day: CalendarDay;
  today: CalendarDay;
  windowStart: CalendarDay;
  onToggleRoutine: (isDone: boolean) => void;
  onToggleStep: (stepId: string, isDone: boolean) => void;
  onOpenMenu: () => void;
}) {
  const stats = routineStats(routine, today, windowStart);
  const isArchived = routine.archivedAt !== null;
  const isDone = doneOn(routine, day);
  const progress = stepProgressOn(routine, day);
  const steps = activeStepsOn(routine, day);
  const tone = careTone(isDone, progress.done, stats.isDueToday, isArchived);
  const Icon = AREA_ICONS[routine.area];

  // A future day cannot be marked done, and an archived routine owes nothing.
  const canTick = !isArchived && isTickable(day, today);

  return (
    <Card elevation={isDone ? "accent" : "raised"} className={cn(isArchived && "opacity-60")}>
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-start gap-3">
          <IconChip tone={isDone ? "score" : "neutral"} size="md">
            <Icon className="h-4 w-4" />
          </IconChip>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-body font-medium text-foreground">{routine.title}</p>
            <p className="truncate text-caption text-muted-foreground">
              {areaLabel(routine.area)} · {scheduleSummary(routine.schedule)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {stats.currentStreak > 0 && (
              <span
                className={cn(
                  "numeric rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                  streakBadgeClass(stats.currentStreak),
                )}
              >
                {formatStreak(stats.currentStreak, stats.streakUnit)}
              </span>
            )}

            <button
              type="button"
              onClick={onOpenMenu}
              aria-label={`Настройки: ${routine.title}`}
              className="rounded-lg p-1.5 text-subtle-foreground transition-colors duration-200 active:bg-fill-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            <motion.button
              type="button"
              whileTap={canTick ? { scale: 0.9 } : undefined}
              disabled={!canTick}
              onClick={() => onToggleRoutine(!isDone)}
              role="checkbox"
              aria-checked={isDone}
              aria-label={isDone ? `Отменить: ${routine.title}` : `Выполнено: ${routine.title}`}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 disabled:opacity-40",
                toggleButtonClass(tone),
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : progress.total > 0 ? (
                <span className="numeric text-[0.6875rem] font-semibold">
                  {progress.done}/{progress.total}
                </span>
              ) : (
                <Check className="h-4 w-4" strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </div>

        {steps.length > 0 && (
          <ul className="flex flex-col gap-1">
            {steps.map((step) => {
              const stepDone = isStepDoneOn(step, day);

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    disabled={!canTick}
                    onClick={() => onToggleStep(step.id, !stepDone)}
                    role="checkbox"
                    aria-checked={stepDone}
                    className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left transition-colors duration-200 active:bg-fill-subtle disabled:opacity-50"
                  >
                    <span
                      className={cn(
                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[0.3rem] border transition-colors duration-200",
                        stepDone
                          ? "border-positive bg-positive text-background"
                          : "border-border-strong",
                      )}
                    >
                      {stepDone && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-caption",
                        stepDone ? "text-subtle-foreground line-through" : "text-foreground",
                      )}
                    >
                      {step.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-2.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-fill-muted">
            <div
              className={cn("h-full rounded-full", progressFillClass(stats.week.ratio, isArchived))}
              style={{ width: `${Math.round(stats.week.ratio * 100)}%` }}
            />
          </div>
          <span className="numeric shrink-0 text-[0.6875rem] text-subtle-foreground">
            {stats.week.done} / {stats.week.target} за неделю
          </span>
        </div>
      </div>
    </Card>
  );
}
