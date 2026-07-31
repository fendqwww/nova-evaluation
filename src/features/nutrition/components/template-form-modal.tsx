"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { MEAL_SLOT_LABELS, MEAL_SLOTS, templateDraftSchema } from "@/features/nutrition/schemas";
import type {
  MealSlot,
  NutritionFoodItem,
  NutritionMealTemplate,
  NutritionMealTemplateItemInput,
} from "@/features/nutrition/types";

/**
 * Build (or edit) a template: name, default meal slot, and a list of
 * food + amount lines picked from the catalogue that already exists. There is
 * no inline food creation here — the same reasoning WorkoutExerciseEditor
 * applies to naming an exercise: this form composes existing rows, it does not
 * duplicate the food form.
 */
export function TemplateFormModal({
  template,
  foods,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  template: NutritionMealTemplate | null;
  foods: NutritionFoodItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: {
    name: string;
    mealSlot: MealSlot;
    items: NutritionMealTemplateItemInput[];
  }) => Promise<unknown>;
  onUpdate: (
    templateId: string,
    draft: { name: string; mealSlot: MealSlot; items: NutritionMealTemplateItemInput[] },
  ) => Promise<unknown>;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [mealSlot, setMealSlot] = useState<MealSlot>(template?.mealSlot ?? "breakfast");
  const [items, setItems] = useState<NutritionMealTemplateItemInput[]>(
    template?.items.map((item) => ({ foodId: item.foodId, amountG: item.amountG })) ?? [],
  );
  const [isPending, setPending] = useState(false);
  const [hasError, setError] = useState(false);

  const activeFoods = foods.filter((food) => food.archivedAt === null);
  const draft = { name, mealSlot, items };
  const isValid = templateDraftSchema.safeParse(draft).success;

  function addLine() {
    if (activeFoods.length === 0) return;
    setItems((current) => [...current, { foodId: activeFoods[0].id, amountG: 100 }]);
  }

  function updateLine(index: number, patch: Partial<NutritionMealTemplateItemInput>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeLine(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function save() {
    setPending(true);
    setError(false);
    try {
      if (template) await onUpdate(template.id, draft);
      else await onCreate(draft);
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
          <ModalTitle>{template ? "Изменить шаблон" : "Новый шаблон"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: мой завтрак"
            aria-label="Название шаблона"
          />

          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Приём пищи по умолчанию</span>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setMealSlot(slot)}
                  aria-pressed={mealSlot === slot}
                  className={cn(
                    "rounded-lg border px-1.5 py-2 text-[0.6875rem] font-medium transition-colors duration-200",
                    mealSlot === slot
                      ? "border-accent-border bg-accent-muted text-accent"
                      : "border-border text-subtle-foreground active:border-border-strong",
                  )}
                >
                  {MEAL_SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-caption text-muted-foreground">Продукты</span>
              <span className="numeric text-[0.6875rem] text-subtle-foreground">{items.length}</span>
            </div>

            {activeFoods.length === 0 ? (
              <p className="text-caption text-subtle-foreground">
                В каталоге нет продуктов — добавьте хотя бы один на вкладке «Продукты».
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={item.foodId}
                      onChange={(event) => updateLine(index, { foodId: event.target.value })}
                      className="h-11 flex-1 rounded-xl border border-border bg-input px-3 text-body text-foreground focus-visible:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
                    >
                      {activeFoods.map((food) => (
                        <option key={food.id} value={food.id}>
                          {food.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={item.amountG}
                      onChange={(event) =>
                        updateLine(index, { amountG: Number(event.target.value) || 0 })
                      }
                      className="w-20 shrink-0"
                      aria-label="Количество, г"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      aria-label="Убрать продукт"
                      className="shrink-0 rounded-md p-2 text-subtle-foreground transition-colors hover:bg-white/[0.06] hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <Button variant="secondary" size="sm" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5" />
                  Добавить продукт
                </Button>
              </div>
            )}
          </div>

          {hasError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуйте ещё раз.</p>
          )}

          <Button className="w-full" size="lg" disabled={!isValid || isPending} onClick={() => void save()}>
            {isPending ? "Сохраняем..." : template ? "Сохранить" : "Создать шаблон"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
