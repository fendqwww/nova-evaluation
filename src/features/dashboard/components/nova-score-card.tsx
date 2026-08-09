"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { Progress } from "@/shared/ui/progress";
import { LifeScoreBreakdownModal } from "@/features/dashboard/components/life-score-breakdown-modal";
import type { LifeScoreResult } from "@/features/life-score/types";

/**
 * The four pillars, and which breakdown keys roll up into each.
 *
 * The index has nine blocks; a hero that showed all nine would be the breakdown
 * modal with extra steps. These four are the ones a health product is actually
 * about, and the arithmetic is honest — each bar is the real sum of its keys
 * over the real sum of their maximums, so a pillar at 60% genuinely means 60%
 * of the points those blocks are worth. Goals, tasks and profile are not
 * dropped; they live in the modal, which is one tap away.
 */
const PILLARS = [
  { key: "sleep", label: "Сон", keys: ["sleep"] },
  { key: "nutrition", label: "Питание", keys: ["nutrition"] },
  { key: "training", label: "Тренировки", keys: ["workouts"] },
  { key: "routine", label: "Регулярность", keys: ["habits", "appearance"] },
] as const;

// Читается как вывод, а не как оценка: индекс уже показан цифрой, и строка
// под ним должна говорить, что эта цифра значит сегодня.
function scoreLabel(score: number): string {
  if (score >= 80) return "Форма держится";
  if (score >= 60) return "Ровный день";
  if (score >= 40) return "Есть куда расти";
  return "День только начинается";
}

/**
 * The hero of the dashboard.
 *
 * It used to be a 92px ring in a horizontal row, the same visual weight as the
 * four cards under it — which made the screen a list of equals with no answer
 * to "how am I doing". The ring is now the largest thing on the screen by a
 * wide margin and the four pillars sit under it, so the card answers the
 * question and then shows its working.
 */
export function NovaScoreCard({ result }: { result: LifeScoreResult }) {
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

  const pillars = PILLARS.map((pillar) => {
    const items = result.breakdown.filter((item) =>
      (pillar.keys as readonly string[]).includes(item.key),
    );
    const score = items.reduce((sum, item) => sum + item.score, 0);
    const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0);

    return {
      key: pillar.key,
      label: pillar.label,
      ratio: maxScore === 0 ? 0 : score / maxScore,
    };
  });

  return (
    <>
      <Card elevation="lifted">
        <div className="flex flex-col items-center gap-5 px-4 pb-4 pt-6">
          <div className="flex items-center gap-1.5">
            <span className="text-label uppercase text-muted-foreground">NOVA Score</span>
            <button
              type="button"
              onClick={() => setShowBreakdown(true)}
              aria-label="Из чего складывается NOVA Score"
              className="press-sm -m-1 inline-flex p-1 text-subtle-foreground active:text-muted-foreground"
            >
              <Info className="h-3 w-3" />
            </button>
          </div>

          <CircularProgress value={result.score} size={168} strokeWidth={12}>
            <div className="flex flex-col items-center">
              <span className="numeric text-[3.5rem] font-bold leading-none tracking-[-0.05em] text-foreground">
                {displayValue}
              </span>
              <span className="mt-1 text-caption text-subtle-foreground">из 100</span>
            </div>
          </CircularProgress>

          <p className="text-title text-foreground">{scoreLabel(result.score)}</p>

          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
            {pillars.map((pillar) => (
              <div key={pillar.key} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-caption text-muted-foreground">{pillar.label}</span>
                  <span className="numeric text-caption font-medium text-foreground">
                    {Math.round(pillar.ratio * 100)}%
                  </span>
                </div>
                <Progress value={pillar.ratio} size="sm" label={pillar.label} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <LifeScoreBreakdownModal
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        result={result}
      />
    </>
  );
}
