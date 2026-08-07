"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { CareSchedulePicker } from "@/features/appearance/components/care-schedule-picker";
import { RoutineStepEditor } from "@/features/appearance/components/routine-step-editor";
import { AREA_OPTIONS } from "@/features/appearance/lib/icons";
import { isAreaOffered } from "@/features/appearance/lib/areas";
import {
  ROUTINE_NOTE_MAX,
  TIME_LABELS,
  CARE_TIMES,
  routineDraftSchema,
  type CareStepDraft,
  type RoutineDraft,
} from "@/features/appearance/schemas";
import type {
  CareArea,
  CareRoutineItem,
  CareSchedule,
  CareTime,
} from "@/features/appearance/types";

/**
 * One modal for both creating and editing — the fields are identical, and a
 * second near-copy would be two things to keep in sync. `routine` being null is
 * what makes it a create.
 *
 * State is seeded straight from props, never re-synced by an effect: the parent
 * bumps this component's key on every open, so each opening is a fresh mount
 * showing the row it was opened for. Same convention as WorkoutFormModal.
 *
 * `preset` is how the empty-state shortcuts arrive — a prefilled draft, not a
 * seeded database row. Nothing exists until the user saves, and every field
 * stays editable in between.
 */
export function RoutineFormModal({
  routine,
  preset,
  gender,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  routine: CareRoutineItem | null;
  preset: { area: CareArea; title: string; timeOfDay: CareTime; steps: string[] } | null;
  gender: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: RoutineDraft) => Promise<unknown>;
  onUpdate: (routineId: string, draft: RoutineDraft) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(routine?.title ?? preset?.title ?? "");
  const [note, setNote] = useState(routine?.note ?? "");
  const [area, setArea] = useState<CareArea>(routine?.area ?? preset?.area ?? "skin");
  const [timeOfDay, setTimeOfDay] = useState<CareTime>(
    routine?.timeOfDay ?? preset?.timeOfDay ?? "any",
  );
  const [schedule, setSchedule] = useState<CareSchedule>(routine?.schedule ?? { kind: "daily" });
  const [steps, setSteps] = useState<CareStepDraft[]>(
    routine
      ? routine.steps.map((step) => ({ id: step.id, title: step.title }))
      : (preset?.steps ?? []).map((step) => ({ title: step })),
  );

  const mutation = useMutation({
    mutationFn: async () => {
      // Blank rows are dropped rather than rejected: an empty last step is what
      // an interrupted "+ Шаг" tap leaves behind, and refusing to save over it
      // would punish the user for a stray tap.
      const draft: RoutineDraft = {
        title,
        note,
        area,
        timeOfDay,
        schedule,
        steps: steps.filter((step) => step.title.trim() !== ""),
      };
      return routine ? onUpdate(routine.id, draft) : onCreate(draft);
    },
    onSuccess: () => onOpenChange(false),
  });

  const parsed = routineDraftSchema.safeParse({
    title,
    note,
    area,
    timeOfDay,
    schedule,
    steps: steps.filter((step) => step.title.trim() !== ""),
  });

  // The beard area is only offered to a male profile, but an existing routine
  // already filed under it keeps showing its own chip — hiding the area a row
  // actually has would make the form lie about what it is editing.
  const areaOptions = AREA_OPTIONS.filter(
    (option) => isAreaOffered(option.id, gender) || option.id === area,
  );

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{routine ? "Изменить процедуру" : "Новая процедура"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например: вечерний уход за кожей"
            aria-label="Название процедуры"
          />

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Зона ухода</span>
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

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Когда</span>
            <div className="flex gap-1.5">
              {CARE_TIMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimeOfDay(option)}
                  aria-pressed={option === timeOfDay}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-caption font-medium transition-colors duration-200",
                    option === timeOfDay
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground active:border-border-strong",
                  )}
                >
                  {TIME_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Как часто</span>
            <CareSchedulePicker schedule={schedule} onChange={setSchedule} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-caption text-muted-foreground">Чек-лист</span>
              <span className="numeric text-[0.6875rem] text-subtle-foreground">
                {steps.length}
              </span>
            </div>
            <RoutineStepEditor steps={steps} onChange={setSteps} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="routine-note" className="text-caption text-muted-foreground">
              Заметка — необязательно
            </label>
            <Textarea
              id="routine-note"
              value={note}
              maxLength={ROUTINE_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Средства, порядок, на что обратить внимание"
            />
          </div>

          {routine && (
            <p className="text-caption text-subtle-foreground">
              История сохранится. Новый шаг начнёт считаться с сегодняшнего дня — прошлые
              дни он не изменит.
            </p>
          )}

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
            {mutation.isPending ? "Сохраняем…" : routine ? "Сохранить" : "Создать процедуру"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
