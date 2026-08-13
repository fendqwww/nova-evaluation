"use client";

import type { ReactNode } from "react";
import {
  Check,
  Dumbbell,
  Flame,
  Repeat,
  Sparkles,
  Target,
  Utensils,
} from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { CircularProgress } from "@/shared/ui/circular-progress";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { scoreVerdict } from "@/features/coach/lib/analyze";
import type { LifeScoreResult } from "@/features/life-score/types";
import type { ProfileStreak, ProfileTotals } from "@/features/profile/types";

/**
 * The two headline numbers, then the lifetime tally.
 *
 * Life Score and streak are given a card of their own because they are the two
 * figures that describe *now*; everything in the grid below is cumulative and
 * only ever goes up (or down, when history is edited — see the note in
 * lib/achievements.ts). Mixing the two kinds in one grid would make a number
 * that resets daily look like one that accumulates.
 *
 * The score is the same value the Dashboard renders, from the same computation
 * — see get-profile-overview.action.ts.
 */
export function ProfileStatsCard({
  lifeScore,
  streak,
  totals,
}: {
  lifeScore: LifeScoreResult;
  streak: ProfileStreak;
  totals: ProfileTotals;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center gap-5 p-4">
          <CircularProgress value={lifeScore.score} size={78} strokeWidth={7}>
            <span className="numeric text-title text-foreground">{lifeScore.score}</span>
          </CircularProgress>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-caption text-subtle-foreground">Life Score</p>
              <p className="truncate text-body font-medium text-foreground">
                {scoreVerdict(lifeScore.score)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 shrink-0 text-tint-orange" />
              <p className="text-caption text-muted-foreground">
                {streak.current > 0 ? (
                  <>
                    Серия {streak.current}{" "}
                    {pluralizeRu(streak.current, ["день", "дня", "дней"])}
                    {!streak.isTodayActive && " · сегодня ещё ничего"}
                  </>
                ) : (
                  "Серия прервалась — начните сегодня"
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ШЕСТЬ ПЛИТОК В ТРИ КОЛОНКИ, А НЕ В ДВЕ. В две это три ряда высоких
          карточек — примерно треть экрана на шесть чисел, которые меняются раз
          в сутки. Глагол из подписи («выполнено», «закрыто», «достигнуто»)
          вынесен в заголовок группы: он был один и тот же у всех шести и
          заставлял подписи переноситься на вторую строку, из-за чего плитки в
          ряду получались разной высоты. */}
      <Card>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-label uppercase text-subtle-foreground">Всего сделано</p>

          <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            <StatTile
              icon={<Repeat className="h-4 w-4" />}
              tone="habit"
              value={totals.habitTicks}
              label="привычек"
            />
            <StatTile
              icon={<Check className="h-4 w-4" />}
              tone="task"
              value={totals.tasksCompleted}
              label="задач"
            />
            <StatTile
              icon={<Dumbbell className="h-4 w-4" />}
              tone="score"
              value={totals.workouts}
              label="тренировок"
            />
            <StatTile
              icon={<Utensils className="h-4 w-4" />}
              tone="score"
              value={totals.nutritionDays}
              label="дней еды"
            />
            <StatTile
              icon={<Sparkles className="h-4 w-4" />}
              tone="accent"
              value={totals.careDone}
              label="ухода"
            />
            <StatTile
              icon={<Target className="h-4 w-4" />}
              tone="goal"
              value={totals.goalsCompleted}
              label="целей"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Плитка больше не карточка внутри карточки.
 *
 * Шесть вложенных поверхностей с собственной рамкой и тенью — это шесть
 * контуров там, где нужно шесть чисел. Общая рамка у группы одна, а плитки
 * внутри отличаются цветом значка, и этого достаточно, чтобы их различать.
 */
function StatTile({
  icon,
  tone,
  value,
  label,
}: {
  icon: ReactNode;
  tone: "goal" | "habit" | "task" | "score" | "accent";
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <IconChip tone={tone} size="sm">
        {icon}
      </IconChip>
      <span className="numeric text-title leading-none text-foreground">{value}</span>
      <span className="truncate text-micro text-muted-foreground">{label}</span>
    </div>
  );
}
