"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDay, type CalendarDay } from "@/shared/lib/calendar-day";
import { minutesBetween, formatDuration } from "@/features/sleep/lib/duration";
import { qualityLabel } from "@/features/sleep/lib/format";
import { sleepLogDraftSchema, SLEEP_NOTE_MAX, type SleepLogDraft } from "@/features/sleep/schemas";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * One modal for logging a new night or correcting one already logged —
 * mirrors FoodFormModal's shape: state seeded from props, remounted per
 * opening via a bumped key from the parent (see SleepView).
 */
export function SleepLogModal({
  log,
  day,
  today,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: {
  log: SleepLogItem | null;
  day: CalendarDay;
  today: CalendarDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: SleepLogDraft) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
}) {
  const [bedTime, setBedTime] = useState(log?.bedTime ?? "23:00");
  const [wakeTime, setWakeTime] = useState(log?.wakeTime ?? "07:00");
  const [quality, setQuality] = useState(log?.quality ?? 3);
  const [note, setNote] = useState(log?.note ?? "");
  const [isPending, setPending] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [hasError, setError] = useState(false);

  const targetDay = log?.day ?? day;
  const draft = { day: targetDay, bedTime, wakeTime, quality, note };
  const isValid = sleepLogDraftSchema.safeParse(draft).success;
  const previewMin = minutesBetween(bedTime, wakeTime);

  async function save() {
    setPending(true);
    setError(false);
    try {
      await onSave(draft);
      onOpenChange(false);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{log ? "Изменить ночь" : "Записать сон"}</ModalTitle>
          {/* today is "" until the first fetch resolves — the modal component
              still renders (though closed) during that window, so this has to
              tolerate an empty day rather than hand it to Intl and throw. */}
          {today && <ModalDescription>{formatDay(targetDay, today)}</ModalDescription>}
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Лёг спать</span>
              <Input
                type="time"
                value={bedTime}
                onChange={(event) => setBedTime(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Проснулся</span>
              <Input
                type="time"
                value={wakeTime}
                onChange={(event) => setWakeTime(event.target.value)}
              />
            </label>
          </div>

          <Card elevation="accent">
            <p className="p-3.5 text-center text-body font-medium text-accent">
              {formatDuration(previewMin)} сна
            </p>
          </Card>

          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">Качество сна</span>
            <div className="flex items-center justify-between gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={value === quality}
                  aria-label={`${value} из 5 — ${qualityLabel(value)}`}
                  onClick={() => setQuality(value)}
                  className={cn(
                    "press-sm flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors duration-200",
                    value === quality
                      ? "border-accent-border bg-accent-muted"
                      : "border-border active:border-border-strong",
                  )}
                >
                  <Star
                    className={cn(
                      "h-4.5 w-4.5",
                      value <= quality
                        ? "fill-current text-tint-orange"
                        : "text-subtle-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-caption text-muted-foreground">{qualityLabel(quality)}</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">Заметка (необязательно)</span>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={SLEEP_NOTE_MAX}
              placeholder="Например: просыпался ночью"
              rows={2}
            />
          </label>

          {hasError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуй ещё раз.</p>
          )}

          <div className="flex gap-2">
            {log && onDelete && (
              <Button
                variant="secondary"
                size="lg"
                aria-label="Удалить запись"
                disabled={isPending || isDeleting}
                onClick={() => void remove()}
              >
                {isDeleting ? "…" : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
            <Button
              className="flex-1"
              size="lg"
              disabled={!isValid || isPending || isDeleting}
              onClick={() => void save()}
            >
              {isPending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
