"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconChip } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import {
  PATH_GOAL_KIND_LIST,
  PATH_GOAL_KIND_META,
  type PathGoalKind,
} from "@/features/path/lib/goal-kinds";
import { PATH_WISH_MAX } from "@/features/path/schemas";
import type { PathDraft } from "@/features/path/schemas";

/**
 * «Создать мой путь» — два шага и ни одного лишнего вопроса.
 *
 * ЧТО ЗДЕСЬ РЕШЕНО. Сценарий «я не знаю, что делать» — это не отдельный экран с
 * чатом, а этот визард: человек называет цель нажатием, а не формулировкой, и
 * получает план. Свободное поле «своими словами» стоит вторым и необязательным
 * именно поэтому — пустое поле «опиши свою цель» первым экраном является тестом,
 * который человек, не знающий, чего хочет, проваливает.
 *
 * ВТОРОЙ ШАГ СПРАШИВАЕТ РОВНО ОДНО ЧИСЛО, и только у измеримых целей. Оно уже
 * подставлено: −8% от текущего веса на снижение, +4% на набор (см.
 * create-path.action.ts). Человек либо соглашается, либо правит — но никогда не
 * встречает пустое поле, в которое не знает, что вписать.
 *
 * Возраст, рост, вес и активность не спрашиваются вовсе: они уже известны из
 * онбординга, и переспрашивать их — значит признаваться, что приложение не
 * помнит своего пользователя.
 */
export function PathWizardModal({
  open,
  onOpenChange,
  currentWeightKg,
  onCreate,
  isCreating,
  /** Название текущей цели, когда путь перестраивают, а не создают впервые. */
  replacingTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWeightKg: number | null;
  onCreate: (draft: PathDraft) => Promise<void>;
  isCreating: boolean;
  replacingTitle?: string | null;
}) {
  const [kind, setKind] = useState<PathGoalKind | null>(null);
  const [target, setTarget] = useState("");
  const [wish, setWish] = useState("");
  const [error, setError] = useState<string | null>(null);

  const meta = kind === null ? null : PATH_GOAL_KIND_META[kind];
  const needsTarget = meta?.measure != null && currentWeightKg !== null;

  function pick(next: PathGoalKind) {
    haptics.selection();
    setKind(next);
    setError(null);

    // Подстановка по умолчанию — та же арифметика, что на сервере. Дублирование
    // сознательное и безопасное: сервер всё равно считает сам, если поле пустое,
    // а человек обязан увидеть конкретное число, а не пустое поле.
    const measure = PATH_GOAL_KIND_META[next].measure;
    if (measure && currentWeightKg !== null) {
      const share = measure.direction === "down" ? 0.92 : 1.04;
      setTarget(String(Math.round(currentWeightKg * share)));
    } else {
      setTarget("");
    }
  }

  async function submit() {
    if (kind === null) return;

    setError(null);
    haptics.tap();

    try {
      await onCreate({
        goalKind: kind,
        targetValue: needsTarget ? target : "",
        wish: wish.trim() === "" ? null : wish.trim(),
      });

      haptics.success();
      onOpenChange(false);
      // Состояние не сбрасывается здесь: модалка размонтируется по key на
      // стороне вызывающего, как это делают все формы в приложении.
    } catch {
      haptics.error();
      setError("Не удалось построить план. Попробуй ещё раз.");
    }
  }

  return (
    <Modal open={open} onOpenChange={isCreating ? () => undefined : onOpenChange}>
      <ModalContent className="max-h-[92dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{kind === null ? "Какая у тебя цель?" : meta?.label}</ModalTitle>
          <ModalDescription>
            {kind === null
              ? replacingTitle
                ? `Сейчас в работе: ${replacingTitle}. Новая цель заменит её — прежний путь останется в истории.`
                : "Выбери одну. Nova построит маршрут по твоим данным: возраст, вес, сон и тренировки уже известны."
              : (meta?.tagline ?? "")}
          </ModalDescription>
        </ModalHeader>

        <AnimatePresence mode="wait" initial={false}>
          {kind === null ? (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2"
            >
              {PATH_GOAL_KIND_LIST.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => pick(option.kind)}
                    className="press flex items-center gap-3 rounded-xl border border-border bg-fill-subtle px-3.5 py-3 text-left active:border-border-strong"
                  >
                    <IconChip tone={option.tone} size="md">
                      <Icon className="h-4 w-4" />
                    </IconChip>

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-body font-medium text-foreground">{option.label}</span>
                      <span className="text-caption leading-snug text-muted-foreground">
                        {option.tagline}
                      </span>
                    </span>

                    <ArrowRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-4"
            >
              {needsTarget && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-caption font-medium text-foreground">
                    {meta?.measure?.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={20}
                      max={300}
                      step="0.5"
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                      disabled={isCreating}
                      className="numeric"
                    />
                    <span className="shrink-0 text-body text-muted-foreground">кг</span>
                  </div>
                  <span className="text-micro text-subtle-foreground">
                    Сейчас {currentWeightKg} кг. Nova предложила безопасный шаг — можно изменить.
                  </span>
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-medium text-foreground">
                  Своими словами <span className="text-subtle-foreground">— необязательно</span>
                </span>
                <Textarea
                  value={wish}
                  maxLength={PATH_WISH_MAX}
                  onChange={(event) => setWish(event.target.value)}
                  disabled={isCreating}
                  placeholder="Например: хочу убрать живот к отпуску, но колени болят от бега"
                />
                <span className="text-micro text-subtle-foreground">
                  Ограничения, сроки, что не подходит — Nova учтёт это в плане.
                </span>
              </label>

              {error && <p className="text-caption text-destructive">{error}</p>}

              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={() => void submit()} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Nova строит маршрут
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Создать план
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  disabled={isCreating}
                  onClick={() => {
                    haptics.selection();
                    setKind(null);
                  }}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Другая цель
                </Button>
              </div>

              {/* Что произойдёт после нажатия — сказано до нажатия. План из
                  четырёх этапов, который появляется без предупреждения, читается
                  как чужое расписание, навязанное приложением. */}
              <ul className="flex flex-col gap-1.5 rounded-xl border border-border bg-fill-subtle p-3">
                {[
                  "Маршрут из 2–4 этапов с конкретными шагами",
                  "Шаги ведут в разделы приложения, а не остаются советом",
                  "План можно перестроить или сменить цель в любой момент",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.5} />
                    <span className={cn("text-caption leading-snug text-muted-foreground")}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalContent>
    </Modal>
  );
}
