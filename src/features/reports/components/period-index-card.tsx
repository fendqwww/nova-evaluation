"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { LifeScoreBreakdownModal } from "@/features/life-score/components/life-score-breakdown-modal";
import { haptics } from "@/shared/lib/haptics";
import type { LifeScoreResult } from "@/features/life-score/types";

/**
 * Индекс из девяти блоков — на экране отчётов, и только здесь.
 *
 * ПОЧЕМУ ЭТА КАРТОЧКА ОТДЕЛИЛАСЬ ОТ ГЛАВНОГО ЭКРАНА. Оба места рисовал один
 * компонент с необязательным набором плиток: с плитками — дашборд, без них —
 * отчёты. Выглядело экономно ровно до того момента, когда выяснилось, что это
 * два разных вопроса. Главный экран отвечает «как прожит сегодня» и меряет доли
 * дневного плана; отчёты отвечают «как идёт период» и меряют недельные блоки —
 * привычки, задачи, цели, тренировки, питание, сон, уход. Одно число не может
 * быть ответом на оба вопроса, а компонент с флагом делал вид, что может.
 *
 * Слово «индекс», а не «NOVA Score»: так его называет Коуч во всех своих
 * формулировках, и так на двух экранах не оказывается двух разных чисел под
 * одним именем.
 */
function scoreLabel(score: number): string {
  if (score >= 80) return "Форма держится";
  if (score >= 60) return "Ровный период";
  if (score >= 40) return "Есть куда расти";
  return "Период только начался";
}

/**
 * СЧЁТЧИКА, ОТКРУЧИВАЮЩЕГО ЧИСЛО ОТ НУЛЯ, ЗДЕСЬ БОЛЬШЕ НЕТ — по той же причине,
 * что и в NOVA Score: пока анимация идёт, карточка показывает не тот индекс
 * (проверка в браузере поймала «4 из 100» при настоящих 64). Дуга кольца
 * по-прежнему растёт: она не может соврать числом, а движение остаётся.
 */
export function PeriodIndexCard({ result }: { result: LifeScoreResult }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <>
      <Card elevation="glass">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setShowBreakdown(true);
          }}
          aria-label={`Индекс ${result.score} из 100 — открыть разбор`}
          className="press flex w-full items-center gap-4 p-4 text-left"
        >
          <CircularProgress value={result.score} size={88} strokeWidth={8}>
            <div className="flex flex-col items-center">
              <span className="numeric text-metric-md font-bold tracking-[-0.045em] text-foreground">
                {result.score}
              </span>
              <span className="text-nano uppercase text-subtle-foreground">из 100</span>
            </div>
          </CircularProgress>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-label uppercase text-muted-foreground">Индекс за период</span>
            <p className="text-title text-foreground">{scoreLabel(result.score)}</p>
          </div>

          <Info className="h-4 w-4 shrink-0 text-subtle-foreground" />
        </button>
      </Card>

      <LifeScoreBreakdownModal
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        result={result}
      />
    </>
  );
}
