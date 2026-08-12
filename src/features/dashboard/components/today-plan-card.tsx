"use client";

import Link from "next/link";
import { Check, Droplet, Dumbbell, Moon, UtensilsCrossed } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import {
  PERIOD_LABELS,
  PERIOD_ORDER,
  type TodayPlanItem,
  type TodayPlanKind,
  type TodayPlanPeriod,
  type TodayPlanState,
} from "@/features/dashboard/lib/today-plan";

/**
 * План дня — расписание, которое отвечает на «что дальше».
 *
 * Этого блока не было вовсе. Главный экран говорил, как человек себя чувствует,
 * и молчал о том, что с этим делать в ближайшие часы — а именно за этим
 * открывают приложение днём, а не утром.
 *
 * ФОРМА — вертикальная лента со временем слева. Не список карточек: карточки
 * читаются как равные варианты выбора, лента читается как ход дня, и здесь
 * важен именно порядок. Линия между маркерами не декоративная — она то, что
 * превращает четыре строки в одно расписание.
 *
 * Строка без времени (тренировка без истории, вода) показывает точку вместо
 * часов, а не выдуманное «18:00» — см. заголовок today-plan.ts.
 *
 * ЛЕНТА РАЗБИТА НА ЧАСТИ СУТОК. Шесть-семь строк подряд читались как список дел:
 * «13:00 Обед» и «19:30 Вода» выглядели одинаково важными и одинаково
 * безразличными к тому, который сейчас час. Заголовки «Утро · День · Вечер ·
 * Ночь» стоят почти ничего по месту и возвращают ленте то, ради чего она
 * задумывалась, — вид расписания, а не перечня.
 *
 * Пустые части суток не печатаются вовсе. Заголовок «Ночь» над пустотой сообщал
 * бы, что там что-то должно было быть и не случилось, — а ночью там просто
 * ничего не запланировано.
 */

const ICONS: Record<TodayPlanKind, typeof Check> = {
  meal: UtensilsCrossed,
  workout: Dumbbell,
  water: Droplet,
  sleep: Moon,
};

/**
 * Маркер на ленте. Состояние читается формой и цветом одновременно, чтобы
 * строка оставалась понятной и без цвета.
 */
function Marker({ state, kind }: { state: TodayPlanState; kind: TodayPlanKind }) {
  const Icon = ICONS[kind];

  if (state === "done") {
    return (
      <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-positive-muted text-positive ring-1 ring-inset ring-fill-muted">
        <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
        state === "now"
          ? "bg-accent text-accent-foreground ring-accent-border"
          : state === "missed"
            ? "bg-warning-muted text-warning ring-fill-muted"
            : "bg-fill-muted text-muted-foreground ring-fill-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function Row({ item, isLast }: { item: TodayPlanItem; isLast: boolean }) {
  const isDone = item.state === "done";

  return (
    <Link
      href={item.href}
      onClick={() => haptics.tap()}
      className={cn(
        "press-sm relative flex items-start gap-3 rounded-lg px-2 py-2 active:bg-fill-subtle",
        item.state === "now" && "bg-accent-soft",
      )}
    >
      {/* Соединитель. Идёт от маркера вниз к следующему и обрывается на
          последней строке — иначе лента выглядит незаконченной. */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[2.9375rem] top-9 h-[calc(100%-1.5rem)] w-px bg-border"
        />
      )}

      <span
        className={cn(
          "numeric w-10 shrink-0 pt-1 text-right text-caption tabular-nums",
          item.state === "now"
            ? "font-semibold text-accent"
            : isDone
              ? "text-subtle-foreground"
              : "text-muted-foreground",
        )}
      >
        {item.time ?? "·"}
      </span>

      <Marker state={item.state} kind={item.kind} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <span
          className={cn(
            "truncate text-body font-medium",
            isDone ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {item.title}
        </span>
        <span
          className={cn(
            "text-caption",
            item.state === "missed" ? "text-warning" : "text-muted-foreground",
          )}
        >
          {item.subtitle}
        </span>
      </span>
    </Link>
  );
}

export function TodayPlanCard({ items }: { items: TodayPlanItem[] }) {
  if (items.length === 0) return null;

  const doneCount = items.filter((item) => item.state === "done").length;

  // Строки уже отсортированы по ходу дня, поэтому группировка — это просто
  // раскладка по ключу с сохранением порядка: пересортировывать нечего.
  const byPeriod = new Map<TodayPlanPeriod, TodayPlanItem[]>();
  for (const item of items) {
    const group = byPeriod.get(item.period);
    if (group) group.push(item);
    else byPeriod.set(item.period, [item]);
  }

  const groups = PERIOD_ORDER.map((period) => ({
    period,
    rows: byPeriod.get(period) ?? [],
  })).filter((group) => group.rows.length > 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-section text-muted-foreground">План на сегодня</p>
        <span className="numeric text-caption text-subtle-foreground">
          {doneCount} из {items.length}
        </span>
      </div>

      <Card>
        <div className="flex flex-col p-2">
          {groups.map((group, groupIndex) => (
            <div key={group.period} className="flex flex-col">
              {/* Отступ сверху есть у всех групп, кроме первой: он отделяет
                  части суток друг от друга, а над первой строкой карточки
                  отделять нечего. */}
              <p
                className={cn(
                  "px-2 pb-1 text-label uppercase text-subtle-foreground",
                  groupIndex > 0 && "pt-3",
                )}
              >
                {PERIOD_LABELS[group.period]}
              </p>

              {group.rows.map((item, index) => (
                <Row
                  key={item.key}
                  item={item}
                  // Соединитель обрывается на последней строке *своей* группы:
                  // тянуть линию сквозь заголовок «Вечер» значило бы сначала
                  // разбить ленту на части, а потом их же и склеить.
                  isLast={index === group.rows.length - 1}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
