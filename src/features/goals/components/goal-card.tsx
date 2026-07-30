"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarOff, Check, ChevronRight, Clock } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import { GoalStatusBadge } from "@/features/goals/components/goal-status-badge";
import { countdownTextClass, progressFillClass } from "@/features/goals/lib/tone";
import {
  deadlineInfo,
  formatRemainingSteps,
  formatStepCount,
  goalProgress,
  goalStatus,
} from "@/features/goals/lib/format";
import type { GoalItem } from "@/features/goals/types";

/**
 * A goal as a project, not a list row: name, headline percentage, step count,
 * what is left, the deadline, the live countdown and a status badge — all
 * legible without opening anything.
 *
 * The checkbox and the body are siblings, never nested: a button inside a button
 * is invalid HTML and the inner one stops receiving taps in some engines.
 * Ticking a goal off and opening it are two separate targets.
 */
export function GoalCard({
  goal,
  onToggle,
  onOpen,
  isCelebrating = false,
}: {
  goal: GoalItem;
  onToggle: (isCompleted: boolean) => void;
  onOpen: () => void;
  isCelebrating?: boolean;
}) {
  const progress = goalProgress(goal);
  const status = goalStatus(goal);
  const deadline = deadlineInfo(goal);
  const showSeparateDate = deadline.date !== null && deadline.countdown !== deadline.date;

  return (
    <Card
      elevation={goal.isCompleted ? "inset" : "raised"}
      className="overflow-hidden transition-colors duration-200"
    >
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-start gap-2.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => onToggle(!goal.isCompleted)}
            role="checkbox"
            aria-checked={goal.isCompleted}
            aria-label={goal.isCompleted ? "Вернуть в работу" : "Выполнить цель"}
            className={cn(
              "mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
              goal.isCompleted
                ? "border-positive bg-positive text-background"
                : "border-border-strong text-transparent active:border-accent",
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.button>

          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            {/* The title owns the whole row. The status badge used to sit here
                and squeezed it into two or three ragged lines; it now pairs with
                the percentage below, where state and progress belong together. */}
            <span
              className={cn(
                "min-w-0 flex-1 text-[1.0625rem] font-semibold leading-snug tracking-[-0.018em]",
                goal.isCompleted ? "text-muted-foreground line-through" : "text-foreground",
              )}
            >
              {goal.title}
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-subtle-foreground" />
          </button>
        </div>

        {/* Progress is the loudest thing on the card by design — the percentage
            is set at metric scale, not in caption text. */}
        <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "numeric text-[2rem] font-bold leading-none tracking-[-0.045em]",
                  goal.isCompleted ? "text-positive" : "text-foreground",
                )}
              >
                {progress.percent}%
              </span>
              <GoalStatusBadge status={status} />
            </div>

            <div className="flex flex-col items-end gap-0.5">
              {progress.hasSteps ? (
                <>
                  <span className="numeric text-caption font-semibold text-foreground">
                    {formatStepCount(progress.done, progress.total)}
                  </span>
                  <span className="numeric text-[0.75rem] text-subtle-foreground">
                    {progress.remaining > 0
                      ? formatRemainingSteps(progress.remaining)
                      : "все шаги закрыты"}
                  </span>
                </>
              ) : (
                <span className="text-[0.75rem] text-subtle-foreground">
                  шаги не заданы
                </span>
              )}
            </div>
          </div>

          <GoalProgressBar
            ratio={progress.ratio}
            fillClass={progressFillClass(goal.isCompleted, deadline.tone)}
          />
        </button>

        <div className="flex items-center gap-1.5 border-t border-border pt-2.5">
          {deadline.days === null ? (
            <CalendarOff className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
          ) : (
            <Clock
              className={cn("h-3.5 w-3.5 shrink-0", countdownTextClass(deadline.tone))}
            />
          )}
          <span
            className={cn(
              "text-caption font-medium",
              countdownTextClass(deadline.tone),
            )}
          >
            {deadline.countdown}
          </span>
          {showSeparateDate && (
            <>
              <span className="text-subtle-foreground" aria-hidden>
                ·
              </span>
              <span className="text-caption text-subtle-foreground">{deadline.date}</span>
            </>
          )}
        </div>
      </div>

      {/* The completion moment: a big tick over the whole card, held just long
          enough to register before the card leaves the active list. */}
      <AnimatePresence>
        {isCelebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center bg-surface-1/85 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-positive text-background shadow-[0_12px_32px_-10px_var(--positive)]"
            >
              <Check className="h-8 w-8" strokeWidth={3} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
