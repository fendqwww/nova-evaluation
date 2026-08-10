"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { explainDay } from "@/features/nutrition/lib/education";
import type { DayProgress } from "@/features/nutrition/lib/stats";

/**
 * «Почему это важно» — раскрывающийся блок под цифрами дня.
 *
 * СВЁРНУТ ПО УМОЛЧАНИЮ, И ЭТО ЧАСТЬ ЗАМЫСЛА. Человек, который заходит записать
 * обед, не должен пролистывать три абзаца о белке, чтобы добраться до кнопки.
 * Человек, который впервые видит «140 из 160 г» и не понимает, что это значит,
 * должен найти объяснение там же, не уходя с экрана. Раскрывающийся блок — это
 * ответ на оба запроса; первая строка каждого пункта видна всегда, поэтому даже
 * закрытым он сообщает, где расхождение.
 *
 * Порядок пунктов задаёт lib/education.ts: сверху то, где расхождение с целью
 * больше. Ничего не рендерится, пока цель не задана, — объяснять важность нормы
 * тому, у кого её нет, бессмысленно.
 */
export function MacroWhyCard({ progress }: { progress: DayProgress }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const items = explainDay(progress);

  if (items.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2 px-1">
          <GraduationCap className="h-3.5 w-3.5 text-accent" />
          <p className="text-label uppercase text-muted-foreground">Почему это важно</p>
        </div>

        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const isOpen = openKey === item.key;

            return (
              <div
                key={item.key}
                className="overflow-hidden rounded-xl border border-border bg-fill-subtle"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    haptics.selection();
                    setOpenKey(isOpen ? null : item.key);
                  }}
                  className="press-sm flex w-full items-center gap-2.5 p-2.5 text-left"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      item.state === "over"
                        ? "bg-warning"
                        : item.state === "under"
                          ? "bg-accent"
                          : "bg-tint-green",
                    )}
                  />

                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="text-caption font-medium text-foreground">{item.label}</span>
                    <span className="numeric truncate text-caption text-muted-foreground">
                      {item.fact}
                    </span>
                  </span>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-subtle-foreground transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="flex flex-col gap-2 px-2.5 pb-2.5">
                        <p className="text-caption leading-relaxed text-muted-foreground">
                          {item.why}
                        </p>
                        {item.action && (
                          <p className="rounded-lg bg-accent-soft px-2.5 py-2 text-caption font-medium text-accent">
                            {item.action}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
