"use client";

import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { cn } from "@/shared/lib/cn";
import { formatCalories, formatGrams } from "@/features/nutrition/lib/format";
import { progressBarClass, progressToneClass } from "@/features/nutrition/lib/tone";
import type { DayProgress } from "@/features/nutrition/lib/stats";

/** One macro row: label, value / goal, and a bar — the same row shape repeated three times. */
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
      <div className="flex items-baseline justify-between">
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className={cn("numeric text-caption font-medium", progressToneClass(ratio))}>
          {formatGrams(value)}
          {goal > 0 && <span className="text-subtle-foreground"> / {formatGrams(goal)}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", progressBarClass(ratio))}
          style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The calorie ring plus the three macro bars — the single glance that answers
 * "how is today going" without opening a meal group.
 */
export function MacroSummaryCard({ progress }: { progress: DayProgress }) {
  const hasGoal = progress.calories.goal > 0;

  return (
    <Card>
      <div className="flex items-center gap-4 p-4">
        <CircularProgress value={progress.calories.ratio * 100} size={72} strokeWidth={7}>
          <div className="flex flex-col items-center justify-center">
            <span className="numeric text-[0.9375rem] font-bold leading-tight text-foreground">
              {Math.round(progress.calories.value)}
            </span>
            <span className="text-[0.625rem] text-subtle-foreground">ккал</span>
          </div>
        </CircularProgress>

        <div className="flex flex-1 flex-col gap-2.5">
          <MacroRow label="Белки" value={progress.proteinG.value} goal={progress.proteinG.goal} ratio={progress.proteinG.ratio} />
          <MacroRow label="Жиры" value={progress.fatG.value} goal={progress.fatG.goal} ratio={progress.fatG.ratio} />
          <MacroRow label="Углеводы" value={progress.carbsG.value} goal={progress.carbsG.goal} ratio={progress.carbsG.ratio} />
        </div>
      </div>

      {hasGoal && (
        <div className="border-t border-border px-4 py-2.5 text-caption text-muted-foreground">
          Цель на день — {formatCalories(progress.calories.goal)}
        </div>
      )}
    </Card>
  );
}
