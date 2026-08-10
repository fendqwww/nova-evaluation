"use client";

import { useRef } from "react";
import { Camera, Loader2, Plus, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { useFoodPhotoAnalysis } from "@/features/nutrition/hooks/use-food-photo-analysis";
import type { FoodAnalysis } from "@/ai/types";

/**
 * Два способа записать еду, и порядок между ними — заявление о продукте.
 *
 * ЧТО БЫЛО. Разбор по фото — самая сильная функция раздела и единственная, где
 * работает AI, — жил иконкой-камерой в шапке экрана, а по-настоящему открывался
 * только изнутри формы «Новый продукт», то есть на четвёртом нажатии внутри
 * вспомогательного сценария. Большинство людей никогда бы его не нашли.
 *
 * ЧТО СТАЛО. Фото — первая и главная кнопка, ручной ввод — вторая и тише. Тап
 * по фото открывает камеру напрямую: между намерением и камерой не осталось ни
 * одного экрана. Разбор возвращается сюда же и открывает форму уже
 * заполненной — человек проверяет цифры, а не вводит их.
 *
 * Кнопка ручного ввода не спрятана и не уменьшена до иконки: модель ошибается
 * на составных блюдах, и путь «вписать самому» обязан оставаться очевидным.
 */
export function FoodCaptureCard({
  onAnalyzed,
  onManual,
}: {
  /** Разбор готов — родитель открывает форму, заполненную этими значениями. */
  onAnalyzed: (analysis: FoodAnalysis) => void;
  onManual: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photo = useFoodPhotoAnalysis(onAnalyzed);

  return (
    <Card elevation="accent">
      <div className="flex flex-col gap-3 p-3.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) photo.analyze(file);
            // Сбрасывается, иначе повторный выбор того же файла не вызовет change.
            event.target.value = "";
          }}
        />

        <div className="flex items-stretch gap-2.5">
          <button
            type="button"
            disabled={photo.isPending}
            onClick={() => {
              haptics.tap();
              inputRef.current?.click();
            }}
            className={cn(
              "press relative flex flex-[1.6] flex-col items-start gap-2 overflow-hidden rounded-xl bg-accent px-3.5 py-3 text-left text-accent-foreground",
              "shadow-[0_6px_18px_-8px_var(--accent)] disabled:opacity-70",
              // Тот же верхний блик, что у первичной кнопки и иконочных чипов —
              // свет на всех залитых поверхностях падает с одной стороны.
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/20 before:to-transparent",
            )}
          >
            {photo.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" strokeWidth={2.25} />
            )}
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-semibold">
                {photo.isPending ? "Разбираем…" : "Разобрать по фото"}
              </span>
              <span className="text-caption opacity-80">
                {photo.isPending ? "Nova смотрит на тарелку" : "КБЖУ посчитает Nova"}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tap();
              onManual();
            }}
            className="press flex flex-1 flex-col items-start gap-2 rounded-xl border border-border bg-fill-subtle px-3.5 py-3 text-left active:border-border-strong"
          >
            <Plus className="h-5 w-5 text-muted-foreground" strokeWidth={2.25} />
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-foreground">Вручную</span>
              <span className="text-caption text-muted-foreground">Из своих продуктов</span>
            </span>
          </button>
        </div>

        {/* Ошибки и лимиты остаются в карточке, а не всплывают тостом: причина,
            по которой разбор не случился, относится к этой кнопке. */}
        {photo.limitMessage && (
          <p className="flex items-start gap-2 rounded-lg border border-border bg-fill-subtle p-2.5 text-caption text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{photo.limitMessage} Тарифы — «Настройки» → «Подписка».</span>
          </p>
        )}

        {photo.errorMessage && (
          <p className="text-caption text-destructive">{photo.errorMessage}</p>
        )}
      </div>
    </Card>
  );
}
