"use client";

import { Droplet, Minus, Plus } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { IconChip } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { formatWater } from "@/features/nutrition/lib/format";
import { progressBarClass } from "@/features/nutrition/lib/tone";
import type { MacroProgress } from "@/features/nutrition/lib/stats";

/** How much one tap adds — a glass, not a sip. */
const STEP_ML = 250;

export function WaterCard({
  progress,
  onAdd,
}: {
  progress: MacroProgress;
  onAdd: (deltaMl: number) => void;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <IconChip tone="accent" size="md">
          <Droplet className="h-4 w-4" />
        </IconChip>

        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-body font-medium text-foreground">Вода</span>
            <span className="numeric text-caption text-muted-foreground">
              {formatWater(progress.value)}
              {progress.goal > 0 && <span> / {formatWater(progress.goal)}</span>}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                progressBarClass(progress.ratio),
              )}
              style={{ width: `${Math.round(Math.min(1, progress.ratio) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            aria-label={`Убрать ${STEP_ML} мл`}
            disabled={progress.value <= 0}
            onClick={() => onAdd(-STEP_ML)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button size="icon" aria-label={`Добавить ${STEP_ML} мл`} onClick={() => onAdd(STEP_ML)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
