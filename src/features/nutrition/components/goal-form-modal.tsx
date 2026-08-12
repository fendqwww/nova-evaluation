"use client";

import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/shared/ui/modal";
import { Calculator } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { goalDraftSchema } from "@/features/nutrition/schemas";
import {
  AIM_LABELS,
  NUTRITION_AIMS,
  calculateTargets,
  type ActivityLevel,
  type NutritionAim,
} from "@/features/nutrition/lib/targets";
import type { NutritionGoalItem } from "@/features/nutrition/types";

export function GoalFormModal({
  goal,
  body,
  open,
  onOpenChange,
  onSave,
}: {
  goal: NutritionGoalItem;
  /**
   * The profile figures the formula needs. Null when the profile predates the
   * activity question — the recalculate control then explains what is missing
   * instead of appearing and doing nothing.
   */
  body: {
    age: number;
    heightCm: number;
    weightKg: number;
    gender: string;
    activity: ActivityLevel | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: NutritionGoalItem) => Promise<unknown>;
}) {
  const [calories, setCalories] = useState(String(goal.calories));
  const [protein, setProtein] = useState(String(goal.proteinG));
  const [fat, setFat] = useState(String(goal.fatG));
  const [carbs, setCarbs] = useState(String(goal.carbsG));
  const [water, setWater] = useState(String(goal.waterMl));
  const [isPending, setPending] = useState(false);
  const [hasError, setError] = useState(false);
  const [aim, setAim] = useState<NutritionAim>("maintain");

  const canCompute = body !== null && body.activity !== null;

  /**
   * Fill the fields from the formula rather than saving directly.
   *
   * The user still has to press Сохранить, and every field stays editable. That
   * is the difference between a calculator and a decision made on their behalf:
   * these are estimates with a ±10% spread between two identical-looking
   * people, and the one who knows their own number should be able to keep it.
   */
  function recalculate() {
    // Re-narrowed here rather than relying on `canCompute`: a boolean computed
    // outside the closure does not carry its narrowing into it.
    const activity = body?.activity;
    if (!body || !activity) return;

    const targets = calculateTargets({
      age: body.age,
      heightCm: body.heightCm,
      weightKg: body.weightKg,
      gender: body.gender,
      activity,
      aim,
    });

    setCalories(String(targets.calories));
    setProtein(String(targets.proteinG));
    setFat(String(targets.fatG));
    setCarbs(String(targets.carbsG));
    setWater(String(targets.waterMl));
  }

  const draft = {
    calories: Number(calories) || 0,
    proteinG: Number(protein) || 0,
    fatG: Number(fat) || 0,
    carbsG: Number(carbs) || 0,
    waterMl: Number(water) || 0,
  };
  const isValid = goalDraftSchema.safeParse(draft).success;

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

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Дневная цель</ModalTitle>
          <ModalDescription>
            Ноль означает «не задано» — блок просто не будет учитываться в прогрессе.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          {canCompute ? (
            <div className="flex flex-col gap-2.5 rounded-xl border border-accent-border bg-accent-soft p-3">
              <p className="text-caption text-foreground">
                Nova может посчитать норму из твоего роста, веса, возраста и активности.
              </p>
              <div className="flex gap-1.5">
                {NUTRITION_AIMS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={aim === value}
                    onClick={() => setAim(value)}
                    className={cn(
                      "press-sm flex-1 rounded-lg border px-2 py-1.5 text-caption font-medium transition-colors duration-200",
                      aim === value
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {AIM_LABELS[value].replace(" вес", "").replace(" массу", "")}
                  </button>
                ))}
              </div>
              <Button variant="secondary" size="sm" onClick={recalculate}>
                <Calculator className="h-3.5 w-3.5" />
                Рассчитать
              </Button>
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-fill-subtle p-3 text-caption text-muted-foreground">
              Чтобы Nova считала норму сама, заполни уровень активности — он
              появится после обновления профиля.
            </p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">Калории</span>
            <Input type="number" inputMode="numeric" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="2000" />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Белки, г</span>
              <Input type="number" inputMode="numeric" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Жиры, г</span>
              <Input type="number" inputMode="numeric" value={fat} onChange={(event) => setFat(event.target.value)} placeholder="0" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Углеводы, г</span>
              <Input type="number" inputMode="numeric" value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="0" />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">Вода, мл</span>
            <Input type="number" inputMode="numeric" value={water} onChange={(event) => setWater(event.target.value)} placeholder="2000" />
          </label>

          {hasError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуй ещё раз.</p>
          )}

          <Button className="w-full" size="lg" disabled={!isValid || isPending} onClick={() => void save()}>
            {isPending ? "Сохраняем…" : "Сохранить"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
