"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { scheduleSummary } from "@/features/appearance/lib/schedule";
import { areaLabel } from "@/features/appearance/lib/areas";
import { formatStreak, routineStats } from "@/features/appearance/lib/stats";
import { adherenceTextClass } from "@/features/appearance/lib/tone";
import { cn } from "@/shared/lib/cn";
import type { CareRoutineItem } from "@/features/appearance/types";

/**
 * What a routine is worth, and the three things you can do to it.
 *
 * Archive is offered above delete and described in words, because the two are
 * genuinely different: archiving keeps the history — and the streak it earned
 * is still true — while deleting takes every tick with it. A routine you have
 * finished with is almost always the first of those, so it is the one that
 * reads as the default.
 */
export function RoutineMenuModal({
  routine,
  today,
  windowStart,
  open,
  onOpenChange,
  onEdit,
  onArchive,
  onDelete,
}: {
  routine: CareRoutineItem | null;
  today: CalendarDay;
  windowStart: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onArchive: (isArchived: boolean) => void;
  onDelete: () => Promise<unknown>;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!routine) return null;

  const stats = routineStats(routine, today, windowStart);
  const isArchived = routine.archivedAt !== null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{routine.title}</ModalTitle>
          <ModalDescription>
            {areaLabel(routine.area)} · {scheduleSummary(routine.schedule)}
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Серия" value={formatStreak(stats.currentStreak, stats.streakUnit)} />
            <Metric label="Рекорд" value={formatStreak(stats.bestStreak, stats.streakUnit)} />
            <Metric
              label="За 30 дней"
              value={`${Math.round(stats.adherence * 100)}%`}
              className={adherenceTextClass(stats.adherence)}
            />
          </div>

          {routine.note && (
            <p className="text-caption text-muted-foreground">{routine.note}</p>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="secondary" className="w-full justify-start" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Изменить
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => {
                onArchive(!isArchived);
                onOpenChange(false);
              }}
            >
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4" />
                  Вернуть из архива
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  В архив — история сохранится
                </>
              )}
            </Button>

            {confirming ? (
              <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
                <p className="text-caption text-foreground">
                  Удалить процедуру вместе со всей историей отметок? Это нельзя отменить.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setConfirming(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      void onDelete().then(() => onOpenChange(false));
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface-inset px-3 py-2.5">
      <span className="text-[0.6875rem] text-subtle-foreground">{label}</span>
      <span className={cn("numeric text-body font-semibold text-foreground", className)}>
        {value}
      </span>
    </div>
  );
}
