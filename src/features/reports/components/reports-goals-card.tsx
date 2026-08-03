"use client";

import { Target } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { GoalProgressBar } from "@/features/goals/components/goal-progress-bar";
import type { ReportsSnapshot } from "@/features/reports/types";

export function ReportsGoalsCard({ goals }: { goals: ReportsSnapshot["goals"] }) {
  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3">
          <IconChip tone="goal" size="md">
            <Target className="h-4 w-4" />
          </IconChip>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground">Цели</p>
            <p className="text-caption text-muted-foreground">
              В работе {goals.active} · завершено {goals.completed}
            </p>
          </div>
        </div>

        {goals.items.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/6 pt-3">
            {goals.items.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
                    {goal.title}
                  </span>
                  <span className="numeric shrink-0 text-caption font-semibold text-foreground">
                    {goal.percent}%
                  </span>
                </div>
                <GoalProgressBar ratio={goal.percent / 100} fillClass="bg-accent" size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
