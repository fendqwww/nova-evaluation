"use client";

import { Sparkles } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { daysWord } from "@/features/nutrition/lib/format";
import type { ReportsSnapshot } from "@/features/reports/types";

export function ReportsAppearanceCard({
  appearance,
}: {
  appearance: ReportsSnapshot["appearance"];
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <IconChip tone="score" size="md">
          <Sparkles className="h-4 w-4" />
        </IconChip>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body font-medium text-foreground">Внешность</p>
          <p className="text-caption text-muted-foreground">
            {appearance.activeCount === 0
              ? "Процедур ухода пока нет"
              : `${appearance.doneToday} из ${appearance.dueToday} сегодня${
                  appearance.weakestArea ? ` · слабее всего «${appearance.weakestArea}»` : ""
                }`}
          </p>
        </div>
        {appearance.adherenceWeek !== null && (
          <span className="numeric shrink-0 text-title text-foreground">
            {Math.round(appearance.adherenceWeek * 100)}%
          </span>
        )}
      </div>
      {appearance.streak >= 3 && (
        <p className="px-4 pb-4 text-caption text-muted-foreground">
          Без пропусков {appearance.streak} {daysWord(appearance.streak)} подряд
        </p>
      )}
    </Card>
  );
}
