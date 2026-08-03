"use client";

import { Moon, Star } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { cn } from "@/shared/lib/cn";
import { formatDuration } from "@/features/sleep/lib/duration";
import { qualityLabel } from "@/features/sleep/lib/format";
import { SLEEP_GOAL_MIN } from "@/features/sleep/lib/stats";
import type { SleepLogItem } from "@/features/sleep/types";

/**
 * The hero of the "Сегодня" tab — the same "ring + headline" shape
 * WorkoutsView's week card and NutritionView's macro ring use, so the three
 * Здоровье screens read as one family.
 */
export function SleepTodayCard({
  log,
  onLog,
}: {
  log: SleepLogItem | null;
  onLog: () => void;
}) {
  const ratio = log ? Math.min(1, log.durationMin / SLEEP_GOAL_MIN) : 0;

  return (
    <Card elevation="lifted">
      <div className="flex items-center gap-4 p-4">
        {log ? (
          <CircularProgress value={ratio * 100} size={72} strokeWidth={7}>
            <div className="flex flex-col items-center justify-center">
              <span className="numeric text-[0.9375rem] font-bold leading-tight text-foreground">
                {Math.floor(log.durationMin / 60)}
              </span>
              <span className="text-[0.625rem] text-subtle-foreground">ч сна</span>
            </div>
          </CircularProgress>
        ) : (
          <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full border border-border text-subtle-foreground">
            <Moon className="h-6 w-6" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-label uppercase text-muted-foreground">Прошлая ночь</p>
          <p className="text-title text-foreground">
            {log ? formatDuration(log.durationMin) : "Ещё не записано"}
          </p>
          {log ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={cn(
                    "h-3 w-3",
                    value <= log.quality
                      ? "fill-current text-tint-orange"
                      : "text-subtle-foreground",
                  )}
                />
              ))}
              <span className="ml-1 text-caption text-muted-foreground">{qualityLabel(log.quality)}</span>
            </div>
          ) : (
            <p className="text-caption text-muted-foreground">
              Время сна, пробуждения и качество ночи
            </p>
          )}
        </div>

        <Button size="sm" variant="secondary" onClick={onLog}>
          {log ? "Изменить" : "Записать"}
        </Button>
      </div>
    </Card>
  );
}
