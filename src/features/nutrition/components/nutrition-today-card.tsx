"use client";

import { useRef } from "react";
import { Camera, Loader2, Plus, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { useFoodPhotoAnalysis } from "@/features/nutrition/hooks/use-food-photo-analysis";
import { formatCalories, formatGrams } from "@/features/nutrition/lib/format";
import { progressBarClass, progressToneClass } from "@/features/nutrition/lib/tone";
import type { DayProgress } from "@/features/nutrition/lib/stats";
import type { FoodAnalysis } from "@/ai/types";

/**
 * День целиком: сколько съедено, из чего это состоит и чем это пополнить.
 *
 * ЧТО ЭТО ЗАМЕНИЛО. Три карточки подряд — сводка КБЖУ, съёмка еды и (ниже) вода
 * — отвечали на один вопрос «как у меня сегодня с едой», но выглядели как три
 * равных предложения выбора. Экран про еду читался как панель показателей, а не
 * как ответ.
 *
 * ГЛАВНОЕ ЧИСЛО СТАЛО ГЛАВНЫМ. Калории были набраны 15px внутри кольца 72px —
 * то есть самый важный показатель раздела был мельче подписи под ним. Теперь
 * кольцо 116px, число 32px внутри и остаток дня строкой рядом: на вопрос «что
 * мне есть сегодня» экран отвечает в первую секунду, а не после чтения.
 *
 * ПОЧЕМУ КНОПКИ ВНУТРИ, А НЕ ОТДЕЛЬНОЙ КАРТОЧКОЙ. Съёмка — не самостоятельный
 * раздел, а способ изменить число над ней. Внутри одной карточки, под
 * разделителем, она читается как «сделай так, чтобы эти цифры обновились»;
 * отдельной карточкой читалась как ещё одна функция, конкурирующая со сводкой.
 *
 * Порядок кнопок сохранён из прежней карточки: фото — первое и залитое, ручной
 * ввод — рядом и тише. Модель ошибается на составных блюдах, и путь «вписать
 * самому» обязан оставаться очевидным, а не сворачиваться в иконку.
 */

function MacroRow({
  label,
  value,
  goal,
  ratio,
}: {
  label: string;
  value: number;
  goal: number;
  ratio: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className={cn("numeric text-caption font-medium", progressToneClass(ratio))}>
          {formatGrams(value)}
          {goal > 0 && <span className="text-subtle-foreground"> / {formatGrams(goal)}</span>}
        </span>
      </div>
      <Progress value={ratio} fillClass={progressBarClass(ratio)} label={label} />
    </div>
  );
}

export function NutritionTodayCard({
  progress,
  onAnalyzed,
  onManual,
}: {
  progress: DayProgress;
  /** Разбор готов — родитель открывает форму, заполненную этими значениями. */
  onAnalyzed: (analysis: FoodAnalysis) => void;
  onManual: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photo = useFoodPhotoAnalysis(onAnalyzed);

  const hasGoal = progress.calories.goal > 0;
  const eaten = Math.round(progress.calories.value);
  const left = Math.max(0, Math.round(progress.calories.goal - progress.calories.value));

  return (
    <Card elevation="lifted">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <CircularProgress value={progress.calories.ratio * 100} size={116} strokeWidth={10}>
            <div className="flex flex-col items-center">
              <span className="numeric text-metric-xl font-bold tracking-[-0.045em] text-foreground">
                {eaten}
              </span>
              <span className="text-nano uppercase text-subtle-foreground">ккал</span>
            </div>
          </CircularProgress>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <MacroRow
              label="Белки"
              value={progress.proteinG.value}
              goal={progress.proteinG.goal}
              ratio={progress.proteinG.ratio}
            />
            <MacroRow
              label="Жиры"
              value={progress.fatG.value}
              goal={progress.fatG.goal}
              ratio={progress.fatG.ratio}
            />
            <MacroRow
              label="Углеводы"
              value={progress.carbsG.value}
              goal={progress.carbsG.goal}
              ratio={progress.carbsG.ratio}
            />
          </div>
        </div>

        {/* Остаток дня — единственная строка, которая говорит, что делать
            дальше, а не что уже случилось. Без цели её нет вовсе: «осталось
            0 ккал» человеку без нормы было бы неправдой. */}
        {hasGoal && (
          <p className="text-caption text-muted-foreground">
            {left > 0 ? (
              <>
                Осталось <span className="numeric font-medium text-foreground">{formatCalories(left)}</span> из{" "}
                {formatCalories(progress.calories.goal)}
              </>
            ) : (
              <>Норма дня закрыта — {formatCalories(progress.calories.goal)}</>
            )}
          </p>
        )}

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

        <div className="flex items-stretch gap-2.5 border-t border-border pt-4">
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
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-sheen before:to-transparent",
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

        {photo.errorMessage && <p className="text-caption text-destructive">{photo.errorMessage}</p>}
      </div>
    </Card>
  );
}
