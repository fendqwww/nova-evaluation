"use client";

import { useState } from "react";
import { Check, ChevronDown, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { scenarioFor } from "@/features/nutrition/lib/scenarios";
import type { NutritionAim } from "@/features/nutrition/lib/targets";

/**
 * Сценарий питания — четыре недели, а не один день.
 *
 * ФОРМА: ТЕКУЩАЯ НЕДЕЛЯ РАСКРЫТА, ОСТАЛЬНЫЕ СВЁРНУТЫ. Четыре недели, развёрнутые
 * целиком, — это экран текста, который читают один раз и никогда не открывают
 * снова. Свёрнутые целиком — оглавление, из которого не следует ни одного
 * действия. Открытой стоит та неделя, на которой человек находится: сегодняшние
 * задачи видны без нажатий, будущие доступны тем, кому интересно, куда это идёт,
 * а пройденные помечены и не занимают места.
 *
 * ПРОЙДЕННЫЕ НЕДЕЛИ НЕ СЧИТАЮТСЯ ВЫПОЛНЕННЫМИ. Галочка означает «эта неделя
 * прошла», а не «вы сделали всё, что в ней написано»: отмечать выполнение по
 * календарю значило бы поздравлять человека с работой, которой он не делал.
 */
export function ScenarioCard({
  aim,
  /** Индекс недели, на которой человек сейчас. 0 — первая. */
  currentWeek,
}: {
  aim: NutritionAim;
  currentWeek: number;
}) {
  const scenario = scenarioFor(aim);
  const [openWeek, setOpenWeek] = useState(currentWeek);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-section text-muted-foreground">Сценарий Nova</p>

      <Card elevation="accent">
        <div className="flex items-start gap-3 p-4">
          <IconChip tone="goal" size="md">
            <Target className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <p className="text-title text-foreground">{scenario.title}</p>
            <p className="mt-1 text-caption text-muted-foreground">{scenario.summary}</p>
          </div>
        </div>

        <div className="mx-4 mb-4 rounded-xl border border-border bg-fill-subtle p-3">
          <p className="text-label uppercase text-subtle-foreground">Признак, что работает</p>
          <p className="mt-1 text-caption text-foreground">{scenario.signal}</p>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col divide-y divide-border">
          {scenario.weeks.map((week, index) => {
            const isPast = index < currentWeek;
            const isCurrent = index === currentWeek;
            const isOpen = index === openWeek;

            return (
              <div key={week.week}>
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    setOpenWeek(isOpen ? -1 : index);
                  }}
                  className="press-sm flex w-full items-center gap-3 p-3.5 text-left"
                >
                  <span
                    className={cn(
                      "numeric flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-micro font-semibold ring-1 ring-inset",
                      isCurrent
                        ? "bg-accent text-accent-foreground ring-accent-border"
                        : isPast
                          ? "bg-positive-muted text-positive ring-fill-muted"
                          : "bg-fill-muted text-muted-foreground ring-fill-muted",
                    )}
                  >
                    {isPast ? <Check className="h-3.5 w-3.5" strokeWidth={2.75} /> : week.week}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-body font-medium",
                          isPast ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        Неделя {week.week} · {week.title}
                      </span>
                      {isCurrent && (
                        <span className="shrink-0 rounded-md bg-accent-muted px-1.5 py-0.5 text-micro font-semibold text-accent">
                          сейчас
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                      {week.focus}
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
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <ul className="flex flex-col gap-2 px-3.5 pb-3.5 pl-[3.625rem]">
                        {week.actions.map((action) => (
                          <li key={action} className="flex items-start gap-2">
                            <span
                              aria-hidden
                              className="mt-[0.4375rem] h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full bg-accent"
                            />
                            <span className="text-caption text-lead-foreground">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
