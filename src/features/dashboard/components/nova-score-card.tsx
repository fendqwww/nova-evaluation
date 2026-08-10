"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { LifeScoreBreakdownModal } from "@/features/dashboard/components/life-score-breakdown-modal";
import { HealthScoreRow } from "@/features/health/components/health-overview-card";
import type { HealthScore } from "@/features/health/lib/health-scores";
import type { LifeScoreResult } from "@/features/life-score/types";

// Читается как вывод, а не как оценка: индекс уже показан цифрой, и строка
// под ним должна говорить, что эта цифра значит сегодня.
function scoreLabel(score: number): string {
  if (score >= 80) return "Форма держится";
  if (score >= 60) return "Ровный день";
  if (score >= 40) return "Есть куда расти";
  return "День только начинается";
}

/**
 * Герой главного экрана: индекс дня и состояние организма в одной карточке.
 *
 * ЧТО ЗДЕСЬ БЫЛО И ПОЧЕМУ ИЗМЕНИЛОСЬ. Под кольцом стояли четыре полосы —
 * «столпы» индекса: сон, питание, тренировки, регулярность. Они честно
 * показывали, из чего сложились 82, но отвечали на тот же вопрос, что и разбор
 * в одно нажатие, и при этом дублировали четыре показателя состояния, которые
 * жили отдельной карточкой ниже. Экран говорил о сне трижды: полосой, кольцом и
 * строкой плана.
 *
 * Теперь под индексом стоят сами показатели организма — интерактивные, каждый со
 * своим разбором. Полный разбор индекса из девяти блоков никуда не делся: он в
 * модалке по нажатию на «i», и это единственное место, где он и должен быть.
 *
 * ВАЖНАЯ ЧЕСТНОСТЬ: четыре показателя под числом — не слагаемые этого числа.
 * NOVA Score считает ещё цели, задачи и привычки (см. calculate-life-score.ts), а
 * «Энергия» и «Восстановление» в него не входят вовсе. Поэтому между ними стоит
 * разделитель с подписью «Организм сегодня», а не знак равенства: это два разных
 * взгляда на один день, а не число и его расшифровка.
 */
export function NovaScoreCard({
  result,
  health,
}: {
  result: LifeScoreResult;
  /**
   * Четыре состояния организма — показываются под индексом.
   *
   * Необязательно, потому что этот же герой стоит на экране «Отчёты», где
   * состояние организма измеряется не на сегодня, а за выбранный период, и
   * четыре сегодняшних кольца под индексом за месяц были бы утверждением о
   * другом отрезке времени. Там карточка остаётся индексом и разбором.
   */
  health?: HealthScore[];
}) {
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

          {health && health.length > 0 && (
            <div className="flex w-full flex-col gap-2.5 border-t border-border pt-4">
              <p className="text-label uppercase text-subtle-foreground">Организм сегодня</p>
              <HealthScoreRow scores={health} />
            </div>
          )}
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
