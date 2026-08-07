"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { AREA_OPTIONS } from "@/features/appearance/lib/icons";
import { isAreaOffered } from "@/features/appearance/lib/areas";
import {
  GOAL_NOTE_MAX,
  careGoalDraftSchema,
  type CareGoalDraft,
} from "@/features/appearance/schemas";
import type { CareArea, CareGoalItem } from "@/features/appearance/types";

/**
 * One modal for creating and editing a goal about how the user wants to look.
 *
 * The deadline is optional on purpose: "убрать сухость кожи" is a real goal
 * with no date attached, and forcing one would make the user invent a lie to
 * get past the form.
 */
export function CareGoalFormModal({
  goal,
  gender,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  goal: CareGoalItem | null;
  gender: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: CareGoalDraft) => Promise<unknown>;
  onUpdate: (goalId: string, draft: CareGoalDraft) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [note, setNote] = useState(goal?.note ?? "");
  const [area, setArea] = useState<CareArea>(goal?.area ?? "skin");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const draft: CareGoalDraft = {
        title,
        note,
        area,
        targetDate: targetDate === "" ? null : targetDate,
      };
      return goal ? onUpdate(goal.id, draft) : onCreate(draft);
    },
    onSuccess: () => onOpenChange(false),
  });

  const parsed = careGoalDraftSchema.safeParse({
    title,
    note,
    area,
    targetDate: targetDate === "" ? null : targetDate,
  });

  const areaOptions = AREA_OPTIONS.filter(
    (option) => isAreaOffered(option.id, gender) || option.id === area,
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{goal ? "Изменить цель" : "Цель по внешности"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: убрать сухость кожи"
            aria-label="Название цели"
          />

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Зона</span>
            <div className="grid grid-cols-4 gap-1.5">
              {areaOptions.map((option) => {
                const Icon = option.icon;
                const selected = option.id === area;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setArea(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 text-[0.6875rem] font-medium transition-colors duration-200",
                      selected
                        ? "border-accent-border bg-accent-muted text-accent"
                        : "border-border text-subtle-foreground active:border-border-strong",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="max-w-full truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="care-goal-date" className="text-caption text-muted-foreground">
              Срок — необязательно
            </label>
            <Input
              id="care-goal-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="care-goal-note" className="text-caption text-muted-foreground">
              Заметка — необязательно
            </label>
            <Textarea
              id="care-goal-note"
              value={note}
              maxLength={GOAL_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Что именно хочешь изменить и как это проверить"
            />
          </div>

          {mutation.isError && (
            <p className="text-caption text-destructive">
              Не удалось сохранить. Попробуй ещё раз.
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!parsed.success || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Сохраняем…" : goal ? "Сохранить" : "Создать цель"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
