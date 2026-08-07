"use client";

import { useState } from "react";
import { Archive, Dumbbell, Repeat, RotateCcw, Trash2, Utensils, Wand2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { IconChip } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { ARCHIVE_KIND_LABELS } from "@/features/settings/schemas";
import { formatInstant } from "@/features/settings/lib/format";
import { useArchive } from "@/features/settings/hooks/use-archive";
import type { ArchiveItem, ArchiveKind } from "@/features/settings/types";

const KIND_ICONS: Record<ArchiveKind, typeof Repeat> = {
  habit: Repeat,
  workout: Dumbbell,
  food: Utensils,
  routine: Wand2,
};

const KIND_TONES: Record<ArchiveKind, "habit" | "score" | "accent"> = {
  habit: "habit",
  workout: "score",
  food: "score",
  routine: "accent",
};

/**
 * Everything archived across four sections, in one list.
 *
 * This modal is the reason the archive is a feature rather than a column.
 * Habits, workouts, foods and care routines all archive instead of deleting —
 * a thing you stopped doing still happened — but each screen only shows its own
 * archived rows, and some of them do not show them at all. An archived row with
 * no way back is indistinguishable from a lost one, and this is the way back.
 *
 * Restore is the primary action; permanent delete is secondary and confirms in
 * place. A food that has ever been logged cannot be deleted at all, and the
 * error says why rather than failing generically — that restriction is what
 * keeps a past diary day naming the food it actually contained.
 */
export function ArchiveModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { items, isPending, isError, retry, restore, remove, isWorking } = useArchive(open);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRestore(item: ArchiveItem) {
    setError(null);
    try {
      await restore(item.kind, item.id);
    } catch {
      setError("Не удалось восстановить. Попробуй ещё раз.");
    }
  }

  async function onDelete(item: ArchiveItem) {
    setError(null);
    try {
      await remove(item.kind, item.id);
      setConfirming(null);
    } catch (cause) {
      setConfirming(null);
      setError(
        cause instanceof Error && cause.message.includes("FOOD_IN_USE")
          ? "Продукт нельзя удалить: он уже записан в дневнике питания. Он останется в архиве, чтобы прошлые дни не потеряли название."
          : "Не удалось удалить. Попробуй ещё раз.",
      );
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Архив</ModalTitle>
          <ModalDescription>
            То, что ты перестал вести. История сохранена — вернуть можно в любой
            момент.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-2">
          {error && <p className="px-1 text-caption text-destructive">{error}</p>}

          {isPending && [0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}

          {isError && (
            <EmptyState
              icon={<Archive className="h-5 w-5" />}
              title="Архив не загрузился"
              description="Проверь соединение — ничего не потеряно."
              action={
                <Button variant="secondary" onClick={retry}>
                  Повторить
                </Button>
              }
            />
          )}

          {!isPending && !isError && items.length === 0 && (
            <EmptyState
              className="py-8"
              icon={<Archive className="h-5 w-5" />}
              title="Архив пуст"
              description="Сюда попадают привычки, тренировки, продукты и процедуры, которые ты убрал из активных."
            />
          )}

          {!isPending &&
            items.map((item) => {
              const Icon = KIND_ICONS[item.kind];
              const isConfirming = confirming === item.id;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-border p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <IconChip tone={KIND_TONES[item.kind]} size="md">
                      <Icon className="h-4 w-4" />
                    </IconChip>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-body font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {ARCHIVE_KIND_LABELS[item.kind]}
                        {item.detail ? ` · ${item.detail}` : ""} ·{" "}
                        {formatInstant(item.archivedAt)}
                      </p>
                    </div>
                  </div>

                  {isConfirming ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setConfirming(null)}
                        disabled={isWorking}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => onDelete(item)}
                        disabled={isWorking}
                      >
                        Удалить навсегда
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => onRestore(item)}
                        disabled={isWorking}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Вернуть
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Удалить навсегда"
                        onClick={() => setConfirming(item.id)}
                        disabled={isWorking}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </ModalContent>
    </Modal>
  );
}
