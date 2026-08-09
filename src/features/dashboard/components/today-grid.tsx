"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Dumbbell, Droplet, Moon, UtensilsCrossed, Plus } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { cn } from "@/shared/lib/cn";
import { progressBarClass } from "@/features/nutrition/lib/tone";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

/**
 * Today, in four tiles.
 *
 * This block did not exist. The home screen showed an index, a coach preview
 * and three counts of goals/habits/tasks — so a person opening a health app
 * could not see what they had eaten, how they had slept or whether they had
 * trained without navigating two levels down. Every number here is a real
 * reading, and every tile is a link to the section it came from.
 *
 * A tile with nothing logged says so and offers the action, rather than
 * rendering a confident "0" — an unlogged day and a genuinely empty one are
 * different facts, and only one of them is the user's fault.
 */
function Tile({
  icon,
  tone,
  label,
  href,
  value,
  hint,
  progress,
  fillClass,
  isEmpty,
  emptyLabel,
}: {
  icon: ReactNode;
  tone: "accent" | "goal" | "habit" | "task" | "score" | "ai";
  label: string;
  href: string;
  value: ReactNode;
  hint?: string;
  progress?: number;
  fillClass?: string;
  isEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card interactive className="h-full">
        <div className="flex h-full flex-col gap-2.5 p-3.5">
          <div className="flex items-center gap-2">
            <IconChip tone={tone} size="sm">
              {icon}
            </IconChip>
            <span className="text-caption text-muted-foreground">{label}</span>
          </div>

          {isEmpty ? (
            <div className="flex flex-1 items-end">
              <span className="inline-flex items-center gap-1 text-caption font-medium text-accent">
                <Plus className="h-3.5 w-3.5" />
                {emptyLabel}
              </span>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-end gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="numeric text-[1.5rem] font-bold leading-none tracking-[-0.035em] text-foreground">
                  {value}
                </span>
                {hint && <span className="text-[0.6875rem] text-subtle-foreground">{hint}</span>}
              </div>

              {progress !== undefined && (
                <Progress value={progress} size="sm" fillClass={fillClass} label={label} />
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours} ч` : `${hours} ч ${mins} м`;
}

export function TodayGrid({ health }: { health: DashboardData["todayHealth"] }) {
  const { nutrition, water, sleep, workout } = health;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-section text-muted-foreground">Сегодня</p>

      <div className="grid grid-cols-2 gap-2.5">
        <Tile
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          tone="score"
          label="Питание"
          href="/nutrition"
          isEmpty={!nutrition.hasEntries}
          emptyLabel="Записать еду"
          value={nutrition.calories}
          hint={
            nutrition.hasGoal
              ? `из ${nutrition.caloriesGoal} ккал`
              : "ккал · цель не задана"
          }
          progress={nutrition.hasGoal ? nutrition.ratio : undefined}
          fillClass={progressBarClass(nutrition.ratio)}
        />

        <Tile
          icon={<Moon className="h-3.5 w-3.5" />}
          tone="goal"
          label="Сон"
          href="/sleep"
          isEmpty={sleep.score === null}
          emptyLabel="Записать ночь"
          value={sleep.score ?? 0}
          hint={
            sleep.durationMin !== null
              ? `${formatDuration(sleep.durationMin)} · ${sleep.label.toLowerCase()}`
              : undefined
          }
          progress={(sleep.score ?? 0) / 100}
          fillClass={
            (sleep.score ?? 0) >= 70
              ? "bg-positive"
              : (sleep.score ?? 0) >= 50
                ? "bg-warning"
                : "bg-destructive"
          }
        />

        <Tile
          icon={<Dumbbell className="h-3.5 w-3.5" />}
          tone="task"
          label="Тренировка"
          href="/workouts"
          isEmpty={false}
          value={
            workout.isRestDay ? (
              <span className="text-title font-semibold">Отдых</span>
            ) : (
              `${workout.doneToday}/${workout.plannedToday}`
            )
          }
          hint={
            workout.isRestDay
              ? "Сегодня по плану нет тренировок"
              : (workout.title ?? undefined)
          }
          progress={
            workout.isRestDay
              ? undefined
              : workout.plannedToday === 0
                ? 0
                : workout.doneToday / workout.plannedToday
          }
          fillClass={
            workout.doneToday >= workout.plannedToday ? "bg-positive" : "bg-accent"
          }
        />

        <Tile
          icon={<Droplet className="h-3.5 w-3.5" />}
          tone="ai"
          label="Вода"
          href="/nutrition"
          isEmpty={water.ml === 0}
          emptyLabel="Добавить воду"
          value={
            <>
              {(water.ml / 1000).toFixed(1).replace(".", ",")}
              <span className="text-[0.9375rem] font-semibold"> л</span>
            </>
          }
          hint={water.goalMl > 0 ? `из ${(water.goalMl / 1000).toFixed(1).replace(".", ",")} л` : undefined}
          progress={water.goalMl > 0 ? water.ratio : undefined}
          fillClass={cn(water.ratio >= 1 ? "bg-positive" : "bg-accent")}
        />
      </div>
    </div>
  );
}
