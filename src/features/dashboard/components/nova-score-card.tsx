"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { LifeScoreBreakdownModal } from "@/features/dashboard/components/life-score-breakdown-modal";
import { ScoreBreakdownModal } from "@/features/health/components/health-overview-card";
import { haptics } from "@/shared/lib/haptics";
import type { HealthScore, HealthScoreKey } from "@/features/health/lib/health-scores";
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
 * Свой оттенок у каждого показателя — единственное место в приложении, где
 * категорийный цвет красит поверхность, а не только иконку.
 *
 * Это оправдано ровно здесь: четыре плитки без колец различаются только цветом
 * и подписью, и одинаково-серыми они превратились бы в таблицу из четырёх
 * чисел. Оттенки взяты из общего словаря (--tint-*), а не придуманы заново, и
 * мягкие — 16% в градиенте, то есть подсветка стекла, а не заливка.
 */
const TILE_TINT: Record<HealthScoreKey, string> = {
  sleep: "var(--tint-purple)",
  nutrition: "var(--tint-green)",
  energy: "var(--tint-orange)",
  recovery: "var(--tint-cyan)",
};

/**
 * Одна плитка показателя: подпись, число и вход в разбор.
 *
 * КОЛЬЦА ЗДЕСЬ БОЛЬШЕ НЕТ. Четыре кольца по 76px стоили экрану около двухсот
 * пикселей высоты и не сообщали ничего сверх самого числа — доля от ста
 * читается из «82» ничуть не хуже, чем из дуги вокруг него. Кольцо осталось
 * одно, в центре, и именно поэтому оно снова что-то значит.
 *
 * Подпись и «подробнее» прижаты к внешнему краю плитки: в середине блока стоит
 * общий индекс, и всё, что оказалось бы под ним, обязано оттуда уйти.
 */
function ScoreTile({
  score,
  align,
  onOpen,
}: {
  score: HealthScore;
  align: "left" | "right";
  onOpen: () => void;
}) {
  const tint = TILE_TINT[score.key];
  const isEmpty = score.value === null;

  return (
    <button
      type="button"
      onClick={() => {
        haptics.selection();
        onOpen();
      }}
      style={{
        backgroundImage: `linear-gradient(155deg, color-mix(in oklab, ${tint} 16%, transparent) 0%, transparent 70%)`,
        borderColor: `color-mix(in oklab, ${tint} 30%, transparent)`,
      }}
      // ПЛИТКА НЕ СТЕКЛЯННАЯ, И ЭТО НЕ ЭКОНОМИЯ НА ВИДЕ. backdrop-filter имеет
      // смысл там, где за поверхностью есть что размывать; эти четыре плитки
      // лежат на сплошной карточке, то есть их блюр не виден вообще ни на
      // одном кадре и стоит при этом четырёх слоёв композитинга на каждый
      // скролл. В Mini App на среднем Android это заметно. Ощущение стекла
      // здесь дают цветной градиент, цветная кромка и edge-light — ровно то,
      // что и читается глазом. Настоящий блюр остался у двух поверхностей, где
      // за ними действительно что-то есть: у самой карточки и у кольца в
      // центре, которое лежит поверх плиток.
      className={[
        "press edge-light relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl border bg-surface-2 p-3",
        align === "right" ? "items-end text-right" : "items-start text-left",
      ].join(" ")}
    >
      <span className="text-label uppercase text-muted-foreground">{score.label}</span>

      <span className="numeric text-metric-md font-bold tracking-[-0.04em] text-foreground">
        {isEmpty ? "—" : score.value}
      </span>

      <span className="text-nano font-semibold uppercase" style={{ color: tint }}>
        {isEmpty ? "записать" : "подробнее"}
      </span>
    </button>
  );
}

/**
 * Герой главного экрана: индекс дня и четыре состояния организма одним
 * компактным блоком.
 *
 * ЧТО ЗДЕСЬ БЫЛО И ПОЧЕМУ ИЗМЕНИЛОСЬ. Карточка открывалась кольцом 168px, под
 * ним стояла строка вердикта, под ней разделитель с подписью «Организм
 * сегодня», и только потом сетка из четырёх колец по 76px, у каждого своя
 * подпись и свой вердикт. Всё вместе занимало около 460 пикселей — на телефоне
 * это экран целиком. Человек, открывший приложение, видел одно число и был
 * обязан листать, чтобы узнать хоть что-нибудь ещё: разбор коуча, план дня и
 * быстрые действия начинались за нижним краем. Самый дорогой пиксель продукта
 * уходил на один индекс и пять подписей вокруг него.
 *
 * Теперь это сетка 2×2 из плиток и общий индекс кольцом в её центре, поверх
 * пересечения. Тот же состав данных занимает около 270 пикселей вместо 460 —
 * под ним на первом экране помещается следующий блок.
 *
 * ПОЧЕМУ ИНДЕКС В ЦЕНТРЕ, А НЕ СВЕРХУ. Он не пятый показатель в ряду и не
 * заголовок над ними — он то, во что четыре показателя складываются. Центр
 * пересечения говорит это композицией, без строки «Организм сегодня» и без
 * разделителя, которые раньше объясняли ту же связь словами.
 *
 * ВАЖНАЯ ЧЕСТНОСТЬ СОХРАНЕНА: четыре плитки — не слагаемые центрального числа.
 * NOVA Score считает ещё цели, задачи и привычки (см. calculate-life-score.ts), а
 * «Энергия» и «Восстановление» в него не входят вовсе. Поэтому центр нигде не
 * подписан как их сумма, а полный разбор из девяти блоков лежит за кнопкой «i»
 * в шапке — там же, где и лежал.
 */
export function NovaScoreCard({
  result,
  health,
}: {
  result: LifeScoreResult;
  /**
   * Четыре состояния организма. Необязательно, потому что этот же герой стоит
   * на экране «Отчёты», где состояние организма измеряется не на сегодня, а за
   * выбранный период, и четыре сегодняшних плитки под индексом за месяц были бы
   * утверждением о другом отрезке времени. Там карточка остаётся индексом и
   * вердиктом.
   */
  health?: HealthScore[];
}) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [openKey, setOpenKey] = useState<HealthScoreKey | null>(null);

  const activeScore = health?.find((score) => score.key === openKey) ?? null;
  const hasTiles = health !== undefined && health.length > 0;

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
      <Card elevation="glass">
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex items-center justify-center gap-1.5">
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

          {hasTiles ? (
            <div className="relative grid grid-cols-2 gap-2.5">
              {health.map((score, index) => (
                <ScoreTile
                  key={score.key}
                  score={score}
                  align={index % 2 === 0 ? "left" : "right"}
                  onOpen={() => setOpenKey(score.key)}
                />
              ))}

              {/* Индекс поверх пересечения плиток. Кольцо тонкое и небольшое:
                  здесь оно якорь композиции, а не отдельный измеритель, и
                  крупная дуга снова растащила бы блок по высоте. */}
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setShowBreakdown(true);
                }}
                aria-label={`NOVA Score ${result.score} из 100 — открыть разбор`}
                className="press absolute left-1/2 top-1/2 z-10 flex h-19 w-19 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong glass-panel shadow-raised"
              >
                <CircularProgress value={result.score} size={62} strokeWidth={5} glow={false}>
                  <div className="flex flex-col items-center">
                    <span className="numeric text-metric-sm font-bold tracking-[-0.04em] text-foreground">
                      {displayValue}
                    </span>
                    <span className="text-nano uppercase text-subtle-foreground">из 100</span>
                  </div>
                </CircularProgress>
              </button>
            </div>
          ) : (
            // Экран «Отчёты»: без плиток организма — индекс и вердикт строкой.
            <div className="flex items-center gap-4 px-1 pb-1">
              <CircularProgress value={result.score} size={88} strokeWidth={8}>
                <div className="flex flex-col items-center">
                  <span className="numeric text-metric-md font-bold tracking-[-0.045em] text-foreground">
                    {displayValue}
                  </span>
                  <span className="text-nano uppercase text-subtle-foreground">из 100</span>
                </div>
              </CircularProgress>

              <p className="text-title text-foreground">{scoreLabel(result.score)}</p>
            </div>
          )}

          {hasTiles && (
            <p className="text-center text-caption text-muted-foreground">
              {scoreLabel(result.score)}
            </p>
          )}
        </div>
      </Card>

      <LifeScoreBreakdownModal
        open={showBreakdown}
        onOpenChange={setShowBreakdown}
        result={result}
      />

      {/* Разбор одного показателя — тот же компонент, что и на экранах
          здоровья. Владельцем остаётся health-overview-card: иначе «из чего
          сложился сон» отвечало бы по-разному в зависимости от того, откуда
          нажали. */}
      <ScoreBreakdownModal
        score={activeScore}
        open={openKey !== null}
        onOpenChange={(next) => !next && setOpenKey(null)}
      />
    </>
  );
}
