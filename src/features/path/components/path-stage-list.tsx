"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Lock } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { stepHref } from "@/features/path/lib/goal-kinds";
import type { PathStage } from "@/features/path/lib/progress";
import type { PathStepItem } from "@/features/path/types";

/**
 * Этапы пути.
 *
 * ЭТАПЫ ИДУТ ПО ПОРЯДКУ, И ЭТО ВИДНО. Второй этап не имеет смысла до первого:
 * держать дефицит, не наладив дневник, — это не «параллельная работа», а
 * гарантированный срыв через неделю. Поэтому будущие этапы приглушены и
 * помечены замком: их шаги видны (человек имеет право знать, куда идёт), но
 * отмечать их нельзя, пока не закрыт текущий.
 *
 * Это единственное место в приложении, где действие блокируется порядком, и
 * блокировка сознательно мягкая: замок объясняет причину строкой, а не просто
 * не реагирует на нажатие.
 */
export function PathStageList({
  stages,
  currentStageIndex,
  onToggle,
}: {
  stages: PathStage[];
  /** Индекс этапа, который сейчас в работе. Всё после него — заблокировано. */
  currentStageIndex: number;
  onToggle: (stepId: string, isDone: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-section text-muted-foreground">Этапы</p>

      {stages.map((stage, index) => {
        const isLocked = stage.index > currentStageIndex;
        const isCurrent = stage.index === currentStageIndex;

        return (
          <motion.div
            key={stage.index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card elevation={isCurrent ? "accent" : "raised"} className={cn(isLocked && "opacity-60")}>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  {/* Номер этапа, а не иконка: порядок здесь несёт смысл, и
                      цифра — самый прямой способ его показать. */}
                  <span
                    className={cn(
                      "numeric flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-caption font-semibold",
                      stage.isComplete
                        ? "bg-tint-green-muted text-tint-green"
                        : isCurrent
                          ? "bg-accent text-accent-foreground"
                          : "bg-fill-muted text-muted-foreground",
                    )}
                  >
                    {stage.isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : stage.index + 1}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-title text-foreground">{stage.title}</p>
                      {isLocked && <Lock className="h-3 w-3 shrink-0 text-subtle-foreground" />}
                    </div>
                    <p className="text-caption leading-snug text-muted-foreground">{stage.goal}</p>
                  </div>

                  <span className="numeric shrink-0 text-caption text-muted-foreground">
                    {stage.doneCount}/{stage.steps.length}
                  </span>
                </div>

                <Progress
                  value={stage.ratio}
                  size="sm"
                  label={`Этап ${stage.index + 1}`}
                  fillClass={stage.isComplete ? "bg-tint-green" : "bg-accent"}
                />

                <div className="flex flex-col gap-1.5">
                  {stage.steps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      isLocked={isLocked}
                      onToggle={onToggle}
                    />
                  ))}
                </div>

                {isLocked && (
                  <p className="text-[0.6875rem] leading-snug text-subtle-foreground">
                    Откроется, когда закончится этап {currentStageIndex + 1}. Порядок здесь важен:
                    следующий этап опирается на привычки предыдущего.
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Один шаг.
 *
 * Вся строка — цель нажатия, а не квадрат 20×20: попасть пальцем в маленькую
 * отметку на телефоне трудно, и промах читается как «приложение не отвечает» —
 * тот же аргумент, по которому так устроен Checkbox в shared/ui.
 *
 * Ссылка в раздел лежит отдельной кнопкой справа, вне зоны отметки: нажатие
 * «открыть питание» не должно попутно закрывать шаг.
 */
function StepRow({
  step,
  isLocked,
  onToggle,
}: {
  step: PathStepItem;
  isLocked: boolean;
  onToggle: (stepId: string, isDone: boolean) => void;
}) {
  const href = stepHref(step.target);

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={step.isDone}
        disabled={isLocked}
        onClick={() => {
          // success по факту закрытия шага, selection по снятию: закрытый шаг —
          // это результат, снятый — просто изменение выбора.
          if (step.isDone) haptics.selection();
          else haptics.success();
          onToggle(step.id, !step.isDone);
        }}
        className={cn(
          "press-sm flex min-w-0 flex-1 items-start gap-2.5 rounded-xl p-2.5 text-left",
          "bg-fill-subtle active:bg-fill-muted",
          isLocked && "pointer-events-none",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
            step.isDone
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border-strong bg-transparent",
          )}
        >
          {step.isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>

        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              "text-caption font-medium",
              step.isDone ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {step.title}
          </span>
          {step.hint && !step.isDone && (
            <span className="text-[0.6875rem] leading-snug text-subtle-foreground">
              {step.hint}
            </span>
          )}
        </span>
      </button>

      {href && !isLocked && (
        <Link
          href={href}
          onClick={() => haptics.tap()}
          aria-label={`Открыть раздел для шага «${step.title}»`}
          className="press-sm flex w-10 shrink-0 items-center justify-center rounded-xl bg-fill-subtle text-subtle-foreground active:bg-fill-muted active:text-foreground"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
