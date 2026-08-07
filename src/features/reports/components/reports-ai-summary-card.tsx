"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { CoachAnswerBody } from "@/features/coach/components/coach-answer-body";
import type { CoachAnswer } from "@/features/coach/types";
import type { GenerateReportsAiSummaryResult } from "@/features/reports/server/generate-reports-ai-summary.action";

/**
 * The one card on this screen backed by a real Gemini call, and the only one
 * that is opt-in rather than automatic — see generate-reports-ai-summary.action.ts
 * for why loading the screen must not silently spend a FREE user's budget.
 *
 * Starts on the deterministic brief (always present, free) and swaps in the
 * model's answer in place once the user asks for it, exactly like FoodFormModal
 * swaps in a photo analysis without a page reload.
 */
export function ReportsAiSummaryCard({
  summary,
  aiUsage,
  onGenerate,
  isGenerating,
}: {
  summary: CoachAnswer;
  aiUsage: { used: number; limit: number | null };
  onGenerate: () => Promise<GenerateReportsAiSummaryResult>;
  isGenerating: boolean;
}) {
  const [answer, setAnswer] = useState(summary);
  const [isFromGemini, setFromGemini] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number } | null>(null);
  const [hasError, setError] = useState(false);

  async function refresh() {
    setError(false);
    setLimitInfo(null);
    const result = await onGenerate();

    if (result.ok) {
      setAnswer(result.summary);
      setFromGemini(true);
      return;
    }
    if (result.reason === "limit") setLimitInfo({ used: result.used, limit: result.limit });
    else setError(true);
  }

  const remaining = aiUsage.limit === null ? null : Math.max(0, aiUsage.limit - aiUsage.used);
  const outOfBudget = remaining !== null && remaining <= 0;

  return (
    <Card elevation="accent">
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-label uppercase">AI Summary</span>
          </div>
          <span className="numeric text-[0.6875rem] text-subtle-foreground">
            {isFromGemini
              ? "от Gemini"
              : aiUsage.limit === null
                ? "без ограничений"
                : `сегодня осталось ${remaining} из ${aiUsage.limit}`}
          </span>
        </div>

        <CoachAnswerBody answer={answer} />

        {limitInfo && (
          <p className="text-caption text-muted-foreground">
            Дневной лимит AI-запросов исчерпан ({limitInfo.used} из {limitInfo.limit}). Он обновится
            завтра, а NOVA PLUS снимает его совсем — «Профиль» → «Подписка».
          </p>
        )}
        {hasError && (
          <p className="text-caption text-destructive">
            Не удалось получить ответ от Gemini. Попробуй ещё раз.
          </p>
        )}

        {!isFromGemini && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={isGenerating || outOfBudget}
            onClick={() => void refresh()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
            {isGenerating ? "Спрашиваем Gemini…" : "Обновить с помощью AI"}
          </Button>
        )}
      </div>
    </Card>
  );
}
