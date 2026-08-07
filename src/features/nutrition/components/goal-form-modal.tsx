"use client";

import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { goalDraftSchema } from "@/features/nutrition/schemas";
import type { NutritionGoalItem } from "@/features/nutrition/types";

export function GoalFormModal({
  goal,
  open,
  onOpenChange,
  onSave,
}: {
  goal: NutritionGoalItem;
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
