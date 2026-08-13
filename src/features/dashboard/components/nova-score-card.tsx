"use client";

import Link from "next/link";
import { haptics } from "@/shared/lib/haptics";
import { Card } from "@/shared/ui/card";
import type { DayMetric, DayMetricKey, DayScore } from "@/features/dashboard/lib/day-score";

/**
 * NOVA Score — четыре доли выполнения дня и их среднее в центре.
 *
 * ЧТО ЗДЕСЬ БЫЛО И ПОЧЕМУ УШЛО. Плитки показывали «состояния организма» —
 * Энергию, Восстановление и два вердикта к ним, — а кольцо в центре показывало
 * совсем другое число: индекс из девяти блоков, в который эти плитки не входят.
 * Пять чисел в одном блоке, не связанных ни одним арифметическим действием, и
 * подпись «подробнее» под каждым, потому что ни одно из них нельзя было понять
 * на месте.
 *
 * Теперь центр — буквально среднее четырёх плиток (см. buildDayScore). Это
 * единственное свойство, ради которого композиция «2×2 и кольцо в
 * пересечении» вообще имеет смысл: центр стоит там, где сходятся слагаемые,
 * потому что он и есть их сумма.
 *
 * НИ ОДНОГО ВЕРДИКТА. Раньше под каждым числом стояла строка вроде «Полный бак»
 * или «Нужен отдых», и она занимала столько же места, сколько само число, не
 * добавляя к нему ничего проверяемого. Вместо неё — факт, из которого процент и
 * получен: «1850 / 2200 ккал». Человек видит и долю, и то, из чего она вышла.
 *
 * ПОЧЕМУ ПЛИТКА — ССЫЛКА, А НЕ КНОПКА С МОДАЛКОЙ. Разбор одного показателя
 * целиком лежит на его собственном экране. Модалка была третьим местом, где
 * живёт то же самое, и единственным, откуда нельзя ничего сделать.
 */

/**
 * Свой оттенок у каждой плитки — единственное место в приложении, где
 * категорийный цвет красит поверхность, а не только иконку.
 *
 * Оправдано ровно здесь: четыре плитки без иконок различаются только подписью,
 * и одинаково-серыми они превратились бы в таблицу из четырёх чисел. Оттенки
 * взяты из общего словаря (--tint-*), а не придуманы заново, и мягкие — 14% в
 * градиенте, то есть подсветка стекла, а не заливка.
 */
const TILE_TINT: Record<DayMetricKey, string> = {
  nutrition: "var(--tint-green)",
  water: "var(--tint-cyan)",
  workout: "var(--tint-orange)",
  sleep: "var(--tint-purple)",
};

/**
 * Одна плитка: подпись, доля, факт под ней.
 *
 * Содержимое прижато к внешнему углу — в середине блока лежит кольцо сводки, и
 * всё, что оказалось бы под ним, обязано оттуда уйти. Отсюда четыре разные
 * комбинации выравнивания вместо одной: у верхнего ряда свободен верх, у
 * нижнего — низ.
 */
function MetricTile({ metric, index }: { metric: DayMetric; index: number }) {
  const tint = TILE_TINT[metric.key];
  const isTopRow = index < 2;
  const isLeftColumn = index % 2 === 0;

  return (
    <Link
      href={metric.href}
      onClick={() => haptics.selection()}
      style={{
        backgroundImage: `linear-gradient(155deg, color-mix(in oklab, ${tint} 14%, transparent) 0%, transparent 72%)`,
        borderColor: `color-mix(in oklab, ${tint} 28%, transparent)`,
      }}
      // ПЛИТКА НЕ СТЕКЛЯННАЯ, И ЭТО НЕ ЭКОНОМИЯ НА ВИДЕ. backdrop-filter имеет
      // смысл там, где за поверхностью есть что размывать; эти четыре плитки
      // лежат на сплошной карточке, то есть их блюр не виден ни на одном кадре
      // и стоит при этом четырёх слоёв композитинга на каждый скролл. В Mini App
      // на среднем Android это заметно. Настоящий блюр остался у двух
      // поверхностей, где за ними действительно что-то есть: у самой карточки и
      // у кольца в центре, которое лежит поверх плиток.
      className={[
        "press edge-light relative flex h-28 flex-col gap-0.5 overflow-hidden rounded-2xl border bg-surface-2 p-3.5",
        isTopRow ? "justify-start" : "justify-end",
        isLeftColumn ? "items-start text-left" : "items-end text-right",
      ].join(" ")}
    >
      <span className="text-nano font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {metric.label}
      </span>

      <span className="numeric text-metric-md font-bold leading-none tracking-[-0.045em] text-foreground">
        {metric.percent === null ? "—" : `${metric.percent}%`}
      </span>

      <span className="text-nano text-subtle-foreground">{metric.detail}</span>
    </Link>
  );
}

/**
 * ЗДЕСЬ БЫЛ СЧЁТЧИК, КОТОРЫЙ ОТКРУЧИВАЛ ЦИФРУ ОТ НУЛЯ ЗА 0,9 С. Он снят, и не
 * ради вкуса: пока анимация не доехала, главное число экрана буквально
 * показывает 0%, и любой кадр, снятый до её конца, — это ложное показание.
 * Проверка в браузере поймала ровно это. Число, которое обязано быть точным,
 * не должно зависеть от того, успел ли отработать requestAnimationFrame.
 */
export function NovaScoreCard({ day }: { day: DayScore }) {
  return (
    <Card elevation="glass">
      <div className="flex flex-col gap-3 p-3.5">
        <span className="text-center text-label uppercase text-muted-foreground">
          NOVA Score
        </span>

        <div className="relative grid grid-cols-2 gap-3">
          {day.metrics.map((metric, index) => (
            <MetricTile key={metric.key} metric={metric} index={index} />
          ))}

          {/* Сводка поверх пересечения плиток. Не кнопка: это среднее четырёх
              чисел, которые видны рядом, и разбирать в отдельном окне тут
              нечего — за разбором ведёт сама плитка. */}
          <div
            aria-label={
              day.percent === null
                ? "Недостаточно данных для сводки дня"
                : `День выполнен на ${day.percent} процентов`
            }
            className="pointer-events-none absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border-strong glass-panel shadow-raised"
          >
            <span className="numeric text-metric-sm font-bold leading-none tracking-[-0.045em] text-foreground">
              {day.percent === null ? "—" : `${day.percent}%`}
            </span>
            <span className="mt-1 text-nano uppercase tracking-[0.06em] text-subtle-foreground">
              сводка
            </span>
          </div>
        </div>

        {/* Строка появляется только когда мерить действительно нечего. Пустой
            день не должен объяснять себя текстом — там уже стоят четыре
            прочерка, и подпись под ними была бы третьим повтором того же. */}
        {day.percent === null && (
          <p className="text-center text-caption text-muted-foreground">
            Недостаточно данных — запиши сон, еду или тренировку
          </p>
        )}
      </div>
    </Card>
  );
}
