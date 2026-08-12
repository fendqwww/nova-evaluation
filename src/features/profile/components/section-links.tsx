"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { haptics } from "@/shared/lib/haptics";

/**
 * Разделы, у которых нет своей вкладки.
 *
 * ЗАЧЕМ. Нижняя панель держит пять слотов, и четыре из них заняты тем, что
 * открывают каждый день: «Сегодня», «Питание», «Тренировки», «Коуч». Всё
 * остальное — планирование и уход — переехало сюда, и переезд имеет смысл
 * ровно до тех пор, пока у каждого раздела есть видимый вход. Без этого блока
 * «Цели», «Привычки» и «Задачи» существовали бы только по прямой ссылке, то
 * есть были бы удалены на практике, оставшись в кодовой базе.
 *
 * Строка, а не сетка иконок: у разделов разная частота использования и разное
 * назначение, и подпись под названием — единственное, что позволяет это
 * различить, не открывая каждый.
 */

export interface SectionLinkItem {
  key: string;
  href: string;
  label: string;
  hint: string;
  icon: ReactNode;
  tone: "goal" | "habit" | "task" | "score" | "ai" | "accent" | "neutral";
}

export interface SectionLinkGroup {
  key: string;
  /** Подзаголовок внутри карточки. «Развитие», «План», «Ещё». */
  title: string;
  items: SectionLinkItem[];
}

function LinkRow({ item, isLast }: { item: SectionLinkItem; isLast: boolean }) {
  return (
    <Link
      href={item.href}
      onClick={() => haptics.tap()}
      className="press-sm flex items-center gap-3 px-4 py-3.5 active:bg-fill-subtle"
      // Разделитель между строками, но не под последней в группе — иначе линия
      // сливается с границей самой группы и ряд выглядит обрезанным.
      style={isLast ? undefined : { boxShadow: "inset 0 -1px 0 0 var(--border)" }}
    >
      <IconChip tone={item.tone} size="md">
        {item.icon}
      </IconChip>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium text-foreground">{item.label}</span>
        <span className="text-caption text-muted-foreground">{item.hint}</span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
    </Link>
  );
}

/**
 * Все разделы без своей вкладки — одной карточкой с подзаголовками внутри.
 *
 * ПОЧЕМУ ОДНА КАРТОЧКА, А НЕ ТРИ. «Развитие», «План» и «Ещё» стояли на профиле
 * тремя отдельными карточками подряд, каждая со своим заголовком снаружи. Три
 * одинаковых прямоугольника со списками ссылок — это оглавление, а не личный
 * кабинет: они делили экран на равные куски и добавляли профилю три блока из
 * двенадцати, ничего не сообщая о самом человеке.
 *
 * Группировка при этом не исчезла — она стала подзаголовком внутри одной
 * поверхности. Ровно та же информация и тот же порядок, но читается как один
 * навигационный блок, каким и является.
 */
export function SectionLinks({ groups }: { groups: SectionLinkGroup[] }) {
  return (
    <Card>
      <div className="flex flex-col">
        {groups.map((group, groupIndex) => (
          <div key={group.key} className="flex flex-col">
            <p
              className="px-4 pb-1.5 pt-3.5 text-section text-muted-foreground"
              // Каждая группа кроме первой отделяется от предыдущей линией во
              // всю ширину — это граница между смыслами, а не между строками.
              style={
                groupIndex === 0 ? undefined : { boxShadow: "inset 0 1px 0 0 var(--border)" }
              }
            >
              {group.title}
            </p>

            {group.items.map((item, index) => (
              <LinkRow
                key={item.key}
                item={item}
                isLast={index === group.items.length - 1}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
