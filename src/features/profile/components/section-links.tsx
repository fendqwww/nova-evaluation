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

export function SectionLinks({
  title,
  items,
}: {
  title?: string;
  items: SectionLinkItem[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {title && <p className="text-section text-muted-foreground">{title}</p>}

      <Card>
        <div className="flex flex-col">
          {items.map((item, index) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => haptics.tap()}
              className="press-sm flex items-center gap-3 px-4 py-3.5 active:bg-fill-subtle"
              // Разделитель между строками, но не под последней — иначе карточка
              // выглядит обрезанной.
              style={index === items.length - 1 ? undefined : { boxShadow: "inset 0 -1px 0 0 var(--border)" }}
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
          ))}
        </div>
      </Card>
    </div>
  );
}
