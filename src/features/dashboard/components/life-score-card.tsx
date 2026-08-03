"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { LifeScoreBreakdownModal } from "@/features/dashboard/components/life-score-breakdown-modal";
import type { LifeScoreResult } from "@/features/life-score/types";

function scoreLabel(score: number): string {
  if (score >= 80) return "Отличное состояние";
  if (score >= 60) return "Хорошее состояние";
  if (score >= 40) return "Есть куда расти";
  return "Начните с малого";
}

/**
 * The hero of the dashboard, deliberately reduced to just the ring, the
 * number and a one-line verdict — the way Apple Fitness leads with the
 * rings, not a report. The five-category breakdown is one tap away
 * (LifeScoreBreakdownModal) rather than permanently occupying the fold.
 */
export function LifeScoreCard({ result }: { result: LifeScoreResult }) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    const controls = animate(count, result.score, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplayValue(Math.round(value)),
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count is a stable MotionValue
  }, [result.score]);

  return (
    <>
      <Card elevation="lifted">
        <CardContent className="flex items-center gap-4 p-4">
          <CircularProgress value={result.score} size={92} strokeWidth={8}>
            <span className="numeric text-metric text-foreground">{displayValue}</span>
          </CircularProgress>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-label uppercase text-muted-foreground">Индекс жизни</p>
              <button
                type="button"
                onClick={() => setShowBreakdown(true)}
                aria-label="Из чего складывается индекс"
                className="press-sm -m-1 inline-flex p-1 text-subtle-foreground active:text-muted-foreground"
              >
                <Info className="h-3 w-3" />
              </button>
            </div>
            <p className="mt-1.5 text-title text-foreground">{scoreLabel(result.score)}</p>
            <p className="mt-1 text-caption text-muted-foreground">
              {displayValue} из 100 · растёт с активностью
            </p>
          </div>
        </CardContent>
      </Card>

      <LifeScoreBreakdownModal
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        result={result}
      />
    </>
  );
}
