"use client";

import { CheckCircle2, Activity, Target, Flame, ListTodo, Dumbbell, Salad } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/shared/ui/modal";
import { IconChip } from "@/shared/ui/card";
import type { LifeScoreResult } from "@/features/life-score/types";

type Tone = "score" | "goal" | "habit" | "task";

const BREAKDOWN_STYLE: Record<string, { icon: typeof CheckCircle2; tone: Tone; bar: string }> = {
  profile: { icon: CheckCircle2, tone: "score", bar: "bg-tint-green" },
  wellness: { icon: Activity, tone: "score", bar: "bg-tint-green" },
  goals: { icon: Target, tone: "goal", bar: "bg-tint-purple" },
  habits: { icon: Flame, tone: "habit", bar: "bg-tint-orange" },
  tasks: { icon: ListTodo, tone: "task", bar: "bg-tint-blue" },
  // Training shares the health-green chip with the two body blocks above it —
  // per globals.css that tint is the body's, and workouts are what it measures.
  workouts: { icon: Dumbbell, tone: "score", bar: "bg-tint-green" },
  nutrition: { icon: Salad, tone: "score", bar: "bg-tint-green" },
};

export function LifeScoreBreakdownModal({
  open,
  onOpenChange,
  result,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: LifeScoreResult;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Из чего складывается индекс</ModalTitle>
          <ModalDescription>
            Профиль, физическое состояние и активность в целях, привычках, задачах,
            тренировках и питании.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-1">
          {result.breakdown.map((item) => {
            const style = BREAKDOWN_STYLE[item.key];
            const Icon = style?.icon ?? CheckCircle2;
            const percentage = Math.round((item.score / item.maxScore) * 100);

            return (
              <div key={item.key} className="flex items-center gap-3 py-2.5">
                <IconChip tone={style?.tone ?? "neutral"} size="sm">
                  <Icon className="h-3.5 w-3.5" />
                </IconChip>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body text-foreground">{item.label}</span>
                    <span className="numeric shrink-0 text-caption font-semibold text-foreground">
                      {item.score}
                      <span className="font-normal text-subtle-foreground"> / {item.maxScore}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/6">
                    <div
                      className={`h-full rounded-full ${style?.bar}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ModalContent>
    </Modal>
  );
}
