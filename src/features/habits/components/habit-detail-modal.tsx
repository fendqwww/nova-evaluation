"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Archive, ArchiveRestore, Flame, Repeat, Trash2 } from "lucide-react";
import { Modal, ModalContent } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import { HabitMonthCalendar } from "@/features/habits/components/habit-month-calendar";
import { deleteHabitAction } from "@/features/habits/server/delete-habit.action";
import { setHabitArchivedAction } from "@/features/habits/server/set-habit-archived.action";
import { describeSchedule } from "@/features/habits/lib/schedule";
import { ADHERENCE_DAYS, habitStats, streakUnitNoun } from "@/features/habits/lib/stats";
import {
  adherenceTextClass,
  progressFillClass,
  streakBadgeClass,
} from "@/features/habits/lib/tone";
import type { HabitItem } from "@/features/habits/types";

function SectionLabel({ children, trailing }: { children: string; trailing?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-label text-subtle-foreground">{children}</span>
      {trailing && (
        <span className="numeric text-caption text-muted-foreground">{trailing}</span>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span className={cn("numeric text-[1.375rem] font-bold leading-none tracking-[-0.03em]", className)}>
        {value}
      </span>
      <span className="text-[0.6875rem] text-subtle-foreground">{label}</span>
    </div>
  );
}

/**
 * The habit opened up: the numbers it has actually produced, the month it
 * produced them in, and the controls that change it.
 *
 * The hero panel carries everything quantitative so the state of the habit is
 * one glance, mirroring GoalDetailModal. The calendar below is not a read-out —
 * it is the editing surface for any day the week strip on the card cannot
 * reach.
 *
 * GoalProgressBar is reused rather than reimplemented: it takes a ratio and a
 * fill class and has no goal-specific behaviour, so a second identical bar
 * would only be a second thing to keep in sync.
 */
export function HabitDetailModal({
  habit,
  today,
  windowStart,
  open,
  onOpenChange,
  onEdit,
  onChanged,
  onDeleted,
  onToggleDay,
}: {
  habit: HabitItem | null;
  today: CalendarDay;
  windowStart: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onChanged: () => void;
  onDeleted: () => void;
  onToggleDay: (habitId: string, day: CalendarDay, isDone: boolean) => void;
}) {
  const rawInitData = useRawInitData();
  // Reset by remount, not by an effect: the parent bumps this component's key
  // on every open, so reopening can never inherit an already-armed delete.
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  const archive = useMutation({
    mutationFn: setHabitArchivedAction,
    onSuccess: onChanged,
  });

  const removeHabit = useMutation({
    mutationFn: deleteHabitAction,
    onSuccess: () => {
      onOpenChange(false);
      onDeleted();
    },
  });

  if (!habit) return null;

  // Captured as consts: `habit` is a parameter binding, so the null-narrowing
  // from the guard above does not reach inside the closures below on its own.
  const habitId = habit.id;
  const isArchived = habit.archivedAt !== null;
  const stats = habitStats(habit, today, windowStart);
  const adherencePercent = Math.round(stats.adherence * 100);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 pr-8">
            <IconChip tone="habit" size="md">
              <Repeat className="h-4 w-4" />
            </IconChip>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2
                className={cn(
                  "text-[1.125rem] font-semibold leading-snug tracking-[-0.02em]",
                  isArchived ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {habit.title}
              </h2>
              <p className="text-caption text-subtle-foreground">
                {describeSchedule(habit.schedule)}
                {isArchived && " · в архиве"}
              </p>
            </div>
          </div>

          <Card elevation="inset" className="rounded-2xl">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "numeric text-[2.5rem] font-bold leading-none tracking-[-0.045em]",
                      stats.currentStreak > 0 && !isArchived
                        ? "text-foreground"
                        : "text-subtle-foreground",
                    )}
                  >
                    {stats.currentStreak}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {streakUnitNoun(stats.currentStreak, stats.streakUnit)} подряд
                  </span>
                  {stats.currentStreak > 0 && !isArchived && (
                    <span
                      className={cn(
                        "flex items-center rounded-md px-1.5 py-0.5",
                        streakBadgeClass(stats.currentStreak),
                      )}
                    >
                      <Flame className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-caption text-muted-foreground">На этой неделе</span>
                  <span className="numeric text-caption font-semibold text-foreground">
                    {stats.week.done} из {stats.week.target}{" "}
                    {pluralizeRu(stats.week.target, ["раз", "раза", "раз"])}
                  </span>
                </div>
                <GoalProgressBar
                  ratio={stats.week.ratio}
                  fillClass={progressFillClass(stats, isArchived)}
                  size="sm"
                />
              </div>

              <div className="flex items-stretch gap-2 border-t border-white/6 pt-3">
                <Stat
                  value={`${adherencePercent}%`}
                  label={`за ${ADHERENCE_DAYS} дней`}
                  className={isArchived ? "text-muted-foreground" : adherenceTextClass(stats.adherence)}
                />
                <span className="w-px bg-white/6" aria-hidden />
                <Stat
                  value={String(stats.bestStreak)}
                  label="лучшая серия за год"
                  className="text-foreground"
                />
                <span className="w-px bg-white/6" aria-hidden />
                <Stat
                  value={String(stats.totalDone)}
                  label="всего за год"
                  className="text-foreground"
                />
              </div>
            </div>
          </Card>

          {habit.note && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>ОПИСАНИЕ</SectionLabel>
              <p className="whitespace-pre-line text-body text-muted-foreground">
                {habit.note}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <SectionLabel>КАЛЕНДАРЬ</SectionLabel>
            <HabitMonthCalendar
              habit={habit}
              today={today}
              windowStart={windowStart}
              disabled={isArchived}
              onToggleDay={(day, isDone) => onToggleDay(habitId, day, isDone)}
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {!isArchived && (
              <Button
                className="w-full"
                size="lg"
                variant={stats.isDoneToday ? "secondary" : "primary"}
                onClick={() => onToggleDay(habitId, today, !stats.isDoneToday)}
              >
                {stats.isDoneToday ? "Снять отметку за сегодня" : "Отметить сегодня"}
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onEdit}>
                Изменить
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={archive.isPending}
                onClick={() =>
                  archive.mutate({ rawInitData, habitId, isArchived: !isArchived })
                }
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    Вернуть
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />В архив
                  </>
                )}
              </Button>
            </div>

            {!isConfirmingDelete && (
              <Button
                variant="ghost"
                className="w-full text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            )}

            {isConfirmingDelete && (
              <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
                <p className="text-caption text-foreground">
                  Удалить привычку вместе со всей историей отметок? Отменить будет нельзя —
                  чтобы просто перестать её отслеживать, отправьте в архив.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={removeHabit.isPending}
                    onClick={() => removeHabit.mutate({ rawInitData, habitId })}
                  >
                    {removeHabit.isPending ? "Удаляем…" : "Удалить"}
                  </Button>
                </div>
              </div>
            )}

            {(archive.isError || removeHabit.isError) && (
              <p className="text-caption text-destructive">
                Не удалось выполнить действие. Попробуй ещё раз.
              </p>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
