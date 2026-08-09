"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { STEPS_MAX, STEP_TITLE_MAX } from "@/features/appearance/schemas";
import type { CareStepDraft } from "@/features/appearance/schemas";

/**
 * The checklist editor inside the routine form.
 *
 * Reordering is by the two arrows on each row rather than drag-and-drop: order
 * is part of the instruction (toner before serum), so it has to be editable,
 * but a touch drag inside an already-scrolling modal fights the scroll on every
 * phone this app runs on.
 *
 * A row that already exists keeps its `id` through every edit here, and that is
 * load-bearing rather than incidental — the repository matches on it to keep
 * the step's row and therefore its ticked days. Renaming "тоник" must not erase
 * the month it was used.
 */
export function RoutineStepEditor({
  steps,
  onChange,
}: {
  steps: CareStepDraft[];
  onChange: (steps: CareStepDraft[]) => void;
}) {
  function update(index: number, title: string) {
    onChange(steps.map((step, at) => (at === index ? { ...step, title } : step)));
  }

  function remove(index: number) {
    onChange(steps.filter((_, at) => at !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <div key={step.id ?? `new-${index}`} className="flex items-center gap-1.5">
          <div className="flex flex-col">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label="Выше"
              className="px-1 text-subtle-foreground transition-colors duration-200 active:text-foreground disabled:opacity-25"
            >
              <GripVertical className="h-3 w-3 rotate-90" />
            </button>
            <button
              type="button"
              disabled={index === steps.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Ниже"
              className="px-1 text-subtle-foreground transition-colors duration-200 active:text-foreground disabled:opacity-25"
            >
              <GripVertical className="h-3 w-3 -rotate-90" />
            </button>
          </div>

          <Input
            value={step.title}
            maxLength={STEP_TITLE_MAX}
            onChange={(event) => update(index, event.target.value)}
            placeholder={`Шаг ${index + 1}`}
            aria-label={`Шаг ${index + 1}`}
            className="h-10 flex-1"
          />

          <button
            type="button"
            onClick={() => remove(index)}
            aria-label={`Убрать шаг ${index + 1}`}
            className="rounded-lg p-2 text-subtle-foreground transition-colors duration-200 active:bg-fill-muted active:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {steps.length < STEPS_MAX && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => onChange([...steps, { title: "" }])}
        >
          <Plus className="h-3.5 w-3.5" />
          Шаг
        </Button>
      )}

      {steps.length === 0 && (
        <p className="text-caption text-subtle-foreground">
          Без шагов процедура отмечается одним касанием. С шагами — по чек-листу.
        </p>
      )}
    </div>
  );
}
