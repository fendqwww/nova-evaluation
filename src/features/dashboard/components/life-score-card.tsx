"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";
import { CheckCircle2, Activity, Target, Flame, ListTodo, Info } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import type { LifeScoreResult } from "@/features/life-score/types";

function scoreLabel(score: number): string {
  if (score >= 80) return "Отличное состояние";
  if (score >= 60) return "Хорошее состояние";
  if (score >= 40) return "Есть куда расти";
  return "Начните с малого";
}

const BREAKDOWN_STYLE: Record<
  string,
  { icon: typeof CheckCircle2; text: string; bar: string; badge: string }
> = {
  profile: {
    icon: CheckCircle2,
    text: "text-tint-green",
    bar: "bg-tint-green",
    badge: "bg-tint-green-muted",
  },
  wellness: {
    icon: Activity,
    text: "text-tint-green",
    bar: "bg-tint-green",
    badge: "bg-tint-green-muted",
  },
  goals: {
    icon: Target,
    text: "text-tint-purple",
    bar: "bg-tint-purple",
    badge: "bg-tint-purple-muted",
  },
  habits: {
    icon: Flame,
    text: "text-tint-orange",
    bar: "bg-tint-orange",
    badge: "bg-tint-orange-muted",
  },
  tasks: {
    icon: ListTodo,
    text: "text-tint-blue",
    bar: "bg-tint-blue",
    badge: "bg-tint-blue-muted",
  },
};

export function LifeScoreCard({ result }: { result: LifeScoreResult }) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, result.score, {
      duration: 1,
      ease: "easeOut",
      onUpdate: (value) => setDisplayValue(Math.round(value)),
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count is a stable MotionValue
  }, [result.score]);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 p-6">
        <div className="flex w-full items-center gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">Индекс жизни</p>
          <span
            title="Учитывает заполненность профиля, физическое состояние и активность в целях, привычках и задачах."
            className="inline-flex"
          >
            <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
          </span>
        </div>

        <CircularProgress value={result.score} size={188} strokeWidth={14}>
          <div className="flex flex-col items-center">
            <span className="text-5xl font-bold tabular-nums text-foreground">
              {displayValue}
            </span>
            <span className="text-xs text-muted-foreground">из 100</span>
          </div>
        </CircularProgress>

        <p className="text-sm font-semibold text-foreground">{scoreLabel(result.score)}</p>

        <div className="flex w-full flex-col gap-3 border-t border-border pt-4">
          {result.breakdown.map((item) => {
            const style = BREAKDOWN_STYLE[item.key];
            const Icon = style?.icon ?? CheckCircle2;
            const percentage = Math.round((item.score / item.maxScore) * 100);

            return (
              <div key={item.key} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style?.badge}`}
                >
                  <Icon className={`h-4 w-4 ${style?.text}`} />
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium tabular-nums text-foreground">
                      {item.score}/{item.maxScore}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
      </CardContent>
    </Card>
  );
}
