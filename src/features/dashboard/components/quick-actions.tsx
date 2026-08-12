"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Droplet, Dumbbell, MoreHorizontal, Moon, UtensilsCrossed } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { RecordSheet } from "@/components/record-sheet";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";

/**
 * Быстрые действия — пять самых частых записей, видимые без нажатий.
 *
 * ЗАЧЕМ ЭТОТ БЛОК ПОЯВИЛСЯ. Записать что-либо можно было только через кнопку
 * «+» в центре панели вкладок: она открывала лист со всеми вариантами. Кнопка
 * без подписи — это функция, о которой надо догадаться, и самая частая работа в
 * приложении для здоровья была спрятана ровно за такой догадкой. Теперь четыре
 * действия названы словами и стоят на главном экране.
 *
 * ПОЧЕМУ ИМЕННО ЭТИ ПЯТЬ. Фото еды — самая сильная функция продукта и самая
 * дешёвая по усилию (навёл камеру, Nova посчитала КБЖУ), поэтому она первая.
 * Приём пищи вручную — то же событие для тех, у кого еда уже в каталоге.
 * Тренировка и сон — два оставшихся ежедневных события. Вес и всё планирование
 * живут за «Ещё»: они действительно редкие.
 *
 * ВОДА ПОДНЯЛАСЬ ИЗ «ЕЩЁ» ПЯТОЙ ПЛИТКОЙ. Прежний довод — «она реже остальных» —
 * оказался неверен наоборот: воду отмечают по нескольку раз в день, чаще любой
 * другой записи в этом списке, и именно у неё цена лишнего нажатия умножается
 * на число повторов.
 *
 * ФОРМА — сетка 2×2, а не ряд. В ряду на подпись остаётся около 70px, то есть
 * «Тренировка» пришлось бы сокращать или набирать шрифтом, на который человек
 * за сорок посмотрит и не прочитает. Две колонки дают полное слово и место под
 * строку-пояснение, а это ровно то, что брифом и требуется: понять за пять
 * секунд, а не разгадать иконку. Пятая плитка занимает всю ширину последнего
 * ряда — половинка рядом с дырой читается как незагрузившийся элемент.
 *
 * Каждая плитка — ссылка с `?add=`, которую целевой экран читает на монтировании
 * и открывает нужную форму (см. useAddIntent). То есть нажатие здесь — последнее
 * перед вводом данных, а не первое из трёх.
 */

const ACTIONS = [
  {
    key: "photo",
    label: "Фото еды",
    hint: "Nova посчитает КБЖУ",
    href: "/nutrition?add=photo",
    icon: Camera,
    tone: "ai",
  },
  {
    key: "food",
    label: "Приём пищи",
    hint: "Из своих продуктов",
    href: "/nutrition?add=food",
    icon: UtensilsCrossed,
    tone: "score",
  },
  {
    // Без `?add=`: старт сессии по ссылке создавал бы строку в базе на самом
    // переходе, и «назад» или переоткрытие вкладки плодили бы пустые
    // тренировки. Экран открывается карточкой сегодняшней тренировки с
    // кнопкой старта — то же действие, но по нажатию человека.
    key: "workout",
    label: "Тренировка",
    hint: "План на сегодня",
    href: "/workouts",
    icon: Dumbbell,
    tone: "task",
  },
  {
    key: "sleep",
    label: "Сон",
    hint: "Записать ночь",
    href: "/sleep?add=1",
    icon: Moon,
    tone: "goal",
  },
  {
    // Вода поднялась из листа «Ещё» пятой плиткой. Довод против неё был в том,
    // что она реже остальных, — и он оказался неверен ровно наоборот: воду
    // отмечают по нескольку раз в день, то есть чаще всего в этом списке, и
    // именно у неё цена лишнего нажатия умножается на число повторов.
    key: "water",
    label: "Вода",
    // Без `?add=`, ровно как в RecordSheet: отдельной формы у воды нет, стакан
    // отмечается карточкой прямо в дневнике. Интент, который никто не читает,
    // обещал бы форму и открывал экран — эту ошибку здесь уже чинили однажды.
    hint: "Отметить стакан",
    href: "/nutrition",
    icon: Droplet,
    tone: "score",
  },
] as const;

/** Что уже показано плитками — лист «Ещё» не повторяет этого. */
const TILE_KEYS = ACTIONS.map((action) => action.key);

export function QuickActions() {
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-section text-muted-foreground">Быстрые действия</p>
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setSheetOpen(true);
          }}
          className="press-sm -m-1 inline-flex items-center gap-1 p-1 text-caption text-subtle-foreground active:text-foreground"
        >
          Ещё
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map((action, index) => {
          const Icon = action.icon;
          // Последняя плитка нечётного списка занимает обе колонки.
          const isLoneLast = index === ACTIONS.length - 1 && ACTIONS.length % 2 === 1;

          // Карточка снаружи, ссылка внутри: `:active` наследуется предками,
          // поэтому нажатие на ссылку запускает press-анимацию самой карточки,
          // а тап-таргетом остаётся ссылка целиком.
          return (
            <Card
              key={action.key}
              interactive
              className={cn("overflow-hidden", isLoneLast && "col-span-2")}
            >
              <Link
                href={action.href}
                onClick={() => haptics.tap()}
                className="flex items-center gap-2.5 p-3"
              >
                <IconChip tone={action.tone} size="md">
                  <Icon className="h-4 w-4" />
                </IconChip>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="truncate text-caption text-muted-foreground">
                    {action.hint}
                  </span>
                </span>
              </Link>
            </Card>
          );
        })}
      </div>

      <RecordSheet open={isSheetOpen} onOpenChange={setSheetOpen} omitKeys={TILE_KEYS} />
    </div>
  );
}
