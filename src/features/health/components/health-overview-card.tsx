"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Battery, Flame, Moon, UtensilsCrossed } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { CircularProgress, ringToneForScore } from "@/shared/ui/circular-progress";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import type { HealthScore, HealthScoreKey } from "@/features/health/lib/health-scores";

/**
 * Состояние организма — то, чем открывается приложение.
 *
 * ЧТО ЭТО ЗАМЕНИЛО. Раньше здесь была сетка из четырёх плиток с сырыми числами:
 * ккал, часы, «1/2», литры. Человек, открывший приложение утром, получал
 * четыре факта и ноль выводов — интерпретацию продукт оставлял ему. Теперь
 * каждая ячейка отвечает на вопрос, а не сообщает измерение: «Энергия 78 —
 * рабочее состояние», и под цифрой строка, объясняющая, почему именно 78.
 *
 * Нажатие открывает разбор, а не переход в раздел. Это сознательно: ценность
 * скора в том, чтобы его понять, и разбор показывает, из каких компонентов он
 * сложился и чего в нём не хватает. Кнопка в разбор ведёт уже в раздел.
 *
 * Цвет колец — состояние, а не принадлежность (см. RingTone). На хорошем дне
 * все четыре кольца брендового цвета; красное кольцо что-то значит.
 */

const ICONS: Record<HealthScoreKey, typeof Flame> = {
  energy: Battery,
  sleep: Moon,
  nutrition: UtensilsCrossed,
  recovery: Flame,
};

function ScoreCell({ score, onOpen }: { score: HealthScore; onOpen: () => void }) {
  const Icon = ICONS[score.key];
  const tone = ringToneForScore(score.value);
  const isEmpty = score.value === null;

  return (
    <button
      type="button"
      onClick={() => {
        haptics.selection();
        onOpen();
      }}
      className="press flex flex-col items-center gap-2.5 rounded-xl border border-border bg-fill-subtle p-3 text-center active:border-border-strong"
    >
      <CircularProgress value={score.value ?? 0} size={76} strokeWidth={6} tone={tone} glow={false}>
        {isEmpty ? (
          <Icon className="h-4.5 w-4.5 text-subtle-foreground" />
        ) : (
          <span className="numeric text-[1.375rem] font-bold leading-none tracking-[-0.04em] text-foreground">
            {score.value}
          </span>
        )}
      </CircularProgress>

      <span className="flex flex-col gap-0.5">
        <span className="text-caption font-medium text-foreground">{score.label}</span>
        <span
          className={cn(
            "text-[0.6875rem] leading-tight",
            isEmpty ? "text-accent" : "text-muted-foreground",
          )}
        >
          {isEmpty ? score.emptyAction : score.verdict}
        </span>
      </span>
    </button>
  );
}

/**
 * Разбор одного показателя.
 *
 * Показывает ровно те компоненты, которые участвовали в счёте, и не показывает
 * неизмеренные — вместо них одна строка о том, каких данных не хватает. Это то
 * же правило, что и в самой формуле: отсутствие данных не штраф, но и не
 * скрытая от пользователя деталь.
 */
function ScoreBreakdownModal({
  score,
  open,
  onOpenChange,
}: {
  score: HealthScore | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!score) return null;

  const measured = score.components.filter((component) => component.measured);
  const missing = score.components.filter((component) => !component.measured);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>
            {score.label}
            {score.value !== null && (
              <span className="numeric ml-2 text-muted-foreground">{score.value} из 100</span>
            )}
          </ModalTitle>
          <ModalDescription>{score.reason}</ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          {measured.length > 0 && (
            <div className="flex flex-col gap-3">
              {measured.map((component) => (
                <div key={component.key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-caption font-medium text-foreground">
                      {component.label}
                    </span>
                    <span className="numeric text-caption text-muted-foreground">
                      {component.score} / {component.maxScore}
                    </span>
                  </div>
                  <Progress
                    value={component.maxScore === 0 ? 0 : component.score / component.maxScore}
                    size="sm"
                    label={component.label}
                  />
                  {component.note && (
                    <p className="text-[0.6875rem] leading-snug text-subtle-foreground">
                      {component.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {missing.length > 0 && (
            <p className="rounded-xl border border-border bg-fill-subtle p-3 text-caption text-muted-foreground">
              Не учтено, потому что нет данных:{" "}
              {missing.map((component) => component.label.toLowerCase()).join(", ")}.
            </p>
          )}

          <Button asChild size="lg" className="w-full">
            <Link href={score.href} onClick={() => onOpenChange(false)}>
              {score.value === null ? score.emptyAction : "Открыть раздел"}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

/**
 * Четыре показателя строкой, без заголовка и без своей карточки.
 *
 * Вынесено из HealthOverviewCard, потому что то же самое понадобилось внутри
 * героя главного экрана: NOVA Score сверху, состояние организма под ним, одна
 * карточка на двоих. Владельцем разбора остаётся этот файл — иначе модалка
 * существовала бы в двух копиях, и «из чего сложился сон» отвечало бы по-разному
 * в зависимости от того, откуда нажали.
 */
export function HealthScoreRow({ scores }: { scores: HealthScore[] }) {
  const [openKey, setOpenKey] = useState<HealthScoreKey | null>(null);
  const active = scores.find((score) => score.key === openKey) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {scores.map((score, index) => (
          // Кольца заполняются по очереди, а не все разом: одновременная
          // анимация четырёх колец читается как загрузка, последовательная —
          // как измерение.
          <motion.div
            key={score.key}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.07, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <ScoreCell score={score} onOpen={() => setOpenKey(score.key)} />
          </motion.div>
        ))}
      </div>

      <ScoreBreakdownModal
        score={active}
        open={openKey !== null}
        onOpenChange={(next) => !next && setOpenKey(null)}
      />
    </>
  );
}

/**
 * Та же строка, но самостоятельным блоком с заголовком.
 *
 * Осталась как отдельный компонент для экранов, где состояние организма
 * показывается само по себе, а не внутри героя.
 */
export function HealthOverviewCard({ scores }: { scores: HealthScore[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-section text-muted-foreground">Состояние</p>

      <Card elevation="lifted">
        <div className="p-3">
          <HealthScoreRow scores={scores} />
        </div>
      </Card>
    </div>
  );
}
