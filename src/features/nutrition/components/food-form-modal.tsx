"use client";

import { useRef, useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { haptics } from "@/shared/lib/haptics";
import { foodDraftSchema } from "@/features/nutrition/schemas";
import {
  per100gFrom,
  useFoodPhotoAnalysis,
} from "@/features/nutrition/hooks/use-food-photo-analysis";
import type { FoodAnalysis } from "@/ai/types";
import type { NutritionFoodItem } from "@/features/nutrition/types";

/**
 * One modal for both creating and editing a catalogue food — the fields are
 * identical, and `food` being null is what makes it a create. Mirrors
 * WorkoutFormModal's shape: state seeded straight from props, remounted per
 * opening via a bumped key from the parent.
 *
 * Create mode also offers "Сканировать фото": a photo goes to Gemini, comes
 * back as a whole-portion estimate, and is converted to per-100g and dropped
 * into the same fields a manual entry would use — never saved on its own.
 * The user still presses "Добавить в каталог" themselves, after correcting
 * whatever the model got wrong.
 *
 * `initialAnalysis` — тот же разбор, но пришедший снаружи: главная кнопка
 * раздела снимает еду до открытия этой формы (см. FoodCaptureCard), и форма
 * открывается уже заполненной. Сценарий один, точек входа две, и обе идут через
 * useFoodPhotoAnalysis, чтобы лимиты и тексты ошибок не разошлись.
 */
export function FoodFormModal({
  food,
  initialName,
  initialAnalysis = null,
  open,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  food: NutritionFoodItem | null;
  initialName?: string;
  initialAnalysis?: FoodAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (draft: {
    name: string;
    caloriesPer100: number;
    proteinPer100: number;
    fatPer100: number;
    carbsPer100: number;
  }) => Promise<unknown>;
  onUpdate: (
    foodId: string,
    draft: {
      name: string;
      caloriesPer100: number;
      proteinPer100: number;
      fatPer100: number;
      carbsPer100: number;
    },
  ) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Значения, пришедшие с внешним разбором, — начальное состояние полей, а не
  // эффект после монтирования: модалка пересоздаётся по ключу на каждое
  // открытие, поэтому seed из props здесь и есть правильный механизм.
  const seed = initialAnalysis ? per100gFrom(initialAnalysis) : null;

  const [name, setName] = useState(food?.name ?? initialAnalysis?.name ?? initialName ?? "");
  const [calories, setCalories] = useState(
    food ? String(food.caloriesPer100) : seed ? String(seed.caloriesPer100) : "",
  );
  const [protein, setProtein] = useState(
    food ? String(food.proteinPer100) : seed ? String(seed.proteinPer100) : "",
  );
  const [fat, setFat] = useState(food ? String(food.fatPer100) : seed ? String(seed.fatPer100) : "");
  const [carbs, setCarbs] = useState(
    food ? String(food.carbsPer100) : seed ? String(seed.carbsPer100) : "",
  );
  const [isPending, setPending] = useState(false);
  const [hasError, setError] = useState(false);

  const photo = useFoodPhotoAnalysis((result) => {
    setName(result.name);
    const per100 = per100gFrom(result);
    setCalories(String(per100.caloriesPer100));
    setProtein(String(per100.proteinPer100));
    setFat(String(per100.fatPer100));
    setCarbs(String(per100.carbsPer100));
  });

  // Разбор, который показывает карточка над полями: либо принесённый снаружи,
  // либо сделанный здесь же кнопкой «Сканировать другое фото».
  const analysis = photo.analysis ?? initialAnalysis;

  const draft = {
    name,
    caloriesPer100: Number(calories) || 0,
    proteinPer100: Number(protein) || 0,
    fatPer100: Number(fat) || 0,
    carbsPer100: Number(carbs) || 0,
  };
  const isValid = foodDraftSchema.safeParse(draft).success;

  async function save() {
    setPending(true);
    setError(false);
    try {
      if (food) await onUpdate(food.id, draft);
      else await onCreate(draft);
      haptics.success();
      onOpenChange(false);
    } catch {
      haptics.error();
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{food ? "Изменить продукт" : "Новый продукт"}</ModalTitle>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          {!food && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) photo.analyze(file);
                  event.target.value = "";
                }}
              />

              <button
                type="button"
                onClick={() => {
                  haptics.tap();
                  inputRef.current?.click();
                }}
                disabled={photo.isPending}
                className="press-sm flex items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-inset px-4 py-3 text-caption font-medium text-muted-foreground active:border-accent disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                {photo.isPending
                  ? "Анализируем фото…"
                  : analysis
                    ? "Сканировать другое фото"
                    : "Сканировать фото еды"}
              </button>

              {analysis && (
                <Card elevation="accent">
                  <div className="flex flex-col gap-2 p-3.5">
                    <div className="flex items-center gap-2 text-accent">
                      <Sparkles className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-caption font-medium">
                        Похоже на {Math.round(analysis.confidence * 100)}% — порция{" "}
                        {analysis.portionDescription || `~${analysis.portionGrams} г`}
                      </span>
                    </div>
                    {analysis.advice.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {analysis.advice.map((tip) => (
                          <li key={tip} className="text-caption text-muted-foreground">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-caption text-subtle-foreground">
                      Значения ниже посчитаны на 100 г — проверьте и поправьте перед сохранением.
                    </p>
                  </div>
                </Card>
              )}

              {photo.limitMessage && (
                <Card elevation="inset">
                  <p className="p-3.5 text-caption text-muted-foreground">
                    {photo.limitMessage} Тарифы — «Настройки» → «Подписка».
                  </p>
                </Card>
              )}

              {photo.errorMessage && (
                <p className="text-caption text-destructive">{photo.errorMessage}</p>
              )}
            </>
          )}

          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: куриная грудка"
            aria-label="Название продукта"
          />

          <p className="text-caption text-muted-foreground">
            Пищевая ценность на 100 г (или 100 мл для напитков)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Калории</span>
              <Input
                type="number"
                inputMode="decimal"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Белки, г</span>
              <Input
                type="number"
                inputMode="decimal"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Жиры, г</span>
              <Input
                type="number"
                inputMode="decimal"
                value={fat}
                onChange={(event) => setFat(event.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Углеводы, г</span>
              <Input
                type="number"
                inputMode="decimal"
                value={carbs}
                onChange={(event) => setCarbs(event.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          {hasError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуй ещё раз.</p>
          )}

          <Button className="w-full" size="lg" disabled={!isValid || isPending} onClick={() => void save()}>
            {isPending ? "Сохраняем…" : food ? "Сохранить" : "Добавить в каталог"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
