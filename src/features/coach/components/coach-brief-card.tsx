"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent, IconChip } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { cn } from "@/shared/lib/cn";
import { CoachAnswerBody } from "@/features/coach/components/coach-answer-body";
import { deltaBadgeClass, formatDelta } from "@/features/coach/lib/tone";
import type { CoachAnalysis, CoachAnswer } from "@/features/coach/types";

/**
 * The first thing on the screen, and never empty.
 *
 * It carries the day's score and the day's verdict together on purpose: the
 * number alone is the Dashboard's job, and a verdict without the number it is
 * derived from is the kind of advice a user has no way to check.
 */
export function CoachBriefCard({
  analysis,
  brief,
}: {
  analysis: CoachAnalysis;
  brief: CoachAnswer;
}) {
  const score = analysis.metrics.lifeScore.score;
  const previous = analysis.yesterday?.lifeScore.score ?? null;
  const delta = previous === null ? null : score - previous;

  return (
    <Card elevation="accent">
      <CardContent className="flex flex-col gap-4 p-4 pt-4">
        <div className="flex items-center gap-4">
          <CircularProgress value={score} size={72} strokeWidth={7}>
            <span className="numeric text-[1.75rem] font-bold leading-none tracking-[-0.045em] text-foreground">
              {score}
            </span>
          </CircularProgress>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <IconChip tone="ai" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
              </IconChip>
              <p className="text-label uppercase text-muted-foreground">Анализ дня</p>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-caption text-muted-foreground">Индекс жизни</span>
              {delta !== null && (
                <span
                  className={cn(
                    "numeric rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                    deltaBadgeClass(delta, true),
                  )}
                >
                  {formatDelta(delta)} за сутки
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3.5">
          <CoachAnswerBody answer={brief} />
        </div>
      </CardContent>
    </Card>
  );
}
