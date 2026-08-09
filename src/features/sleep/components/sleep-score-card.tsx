"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { Moon, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { Progress } from "@/shared/ui/progress";
import { formatDuration } from "@/features/sleep/lib/duration";
import {
  sleepScore,
  sleepScoreLabel,
  sleepTonightAdvice,
} from "@/features/sleep/lib/score";
import { logOnDay } from "@/features/sleep/lib/stats";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import type { SleepLogItem } from "@/features/sleep/types";

function componentFill(ratio: number): string {
  if (ratio >= 0.8) return "bg-positive";
  if (ratio >= 0.5) return "bg-warning";
  return "bg-destructive";
}

/**
 * Last night, scored.
 *
 * This replaced a card that showed hours and five tappable stars. Both numbers
 * were things the user had typed in themselves ten seconds earlier, which meant
 * the section could describe a night but never judge one — "7 ч 20 мин" does not
 * answer "is that good for me?", and the honest answer depends on this person's
 * own history rather than on eight hours being a universal target.
 *
 * The three components are shown with their own bars rather than folded into
 * the ring, because the whole value of a composite score is being able to see
 * which part of it went wrong. A single 62 tells you nothing you can act on.
 */
export function SleepScoreCard({
  logs,
  today,
  onLog,
}: {
  logs: SleepLogItem[];
  today: CalendarDay;
  onLog: () => void;
}) {
  const result = sleepScore(logs, today, today);
  const log = logOnDay(logs, today);
  const advice = sleepTonightAdvice(result, log?.bedTime ?? null);

  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, result.score ?? 0, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplayValue(Math.round(value)),
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count is a stable MotionValue
  }, [result.score]);

  if (result.score === null) {
    return (
      <Card elevation="lifted">
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-full border border-border text-subtle-foreground">
            <Moon className="h-6 w-6" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-label uppercase text-muted-foreground">Прошлая ночь</p>
            <p className="text-title text-foreground">Ещё не записана</p>
            <p className="text-caption text-muted-foreground">
              Отметь время сна — Nova посчитает оценку
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onLog}>
            Записать
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card elevation="lifted">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <CircularProgress value={result.score} size={96} strokeWidth={9}>
            <div className="flex flex-col items-center">
              <span className="numeric text-[1.75rem] font-bold leading-none tracking-[-0.04em] text-foreground">
                {displayValue}
              </span>
              <span className="text-[0.625rem] text-subtle-foreground">Sleep Score</span>
            </div>
          </CircularProgress>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-title text-foreground">{sleepScoreLabel(result.score)}</p>
            {log && (
              <p className="text-caption text-muted-foreground">
                {formatDuration(log.durationMin)} · {log.bedTime}–{log.wakeTime}
              </p>
            )}
            <p className="text-caption text-subtle-foreground">
              {result.norm.isPersonal
                ? `Твоя норма — ${formatDuration(result.norm.targetMin)} по ${result.norm.nights} ночам`
                : `Цель — ${formatDuration(result.norm.targetMin)}, пока мало данных для личной нормы`}
            </p>
          </div>

          <Button size="sm" variant="secondary" onClick={onLog}>
            Изменить
          </Button>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
          {result.components.map((component) => {
            const ratio = component.score / component.maxScore;

            return (
              <div key={component.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-caption text-foreground">{component.label}</span>
                  <span className="numeric text-caption text-muted-foreground">
                    {component.score}/{component.maxScore}
                  </span>
                </div>
                <Progress
                  value={ratio}
                  size="sm"
                  fillClass={componentFill(ratio)}
                  label={component.label}
                />
                <span className="text-[0.6875rem] text-subtle-foreground">{component.note}</span>
              </div>
            );
          })}
        </div>

        {advice && (
          <div className="flex items-start gap-2.5 rounded-xl border border-accent-border bg-accent-soft p-3">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="flex flex-col gap-0.5">
              <p className="text-label uppercase text-accent">Что изменить сегодня вечером</p>
              <p className="text-caption text-foreground">{advice}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
