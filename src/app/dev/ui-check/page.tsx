"use client";

/**
 * Страница только для разработки: рендерит блоки экранов на подставленных
 * данных, без базы и без Telegram.
 *
 * Зачем: экраны приложения живут за авторизацией Mini App и за Postgres, и
 * посмотреть на вёрстку «как на телефоне» без рабочей базы иначе нельзя. Здесь
 * собраны ровно те блоки, где ищутся переполнения и сбитые отступы, с числами
 * заведомо худшего случая — длинный объём, длинные подписи, много категорий.
 *
 * В прод не попадает: каталог /dev уже содержит служебные маршруты, и ни одна
 * ссылка приложения сюда не ведёт.
 */

import { HealthSectionTabs } from "@/components/health-section-tabs";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Button } from "@/shared/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { WorkoutsTabs } from "@/features/workouts/components/workouts-tabs";
import { WorkoutsStatsCard } from "@/features/workouts/components/workouts-stats-card";
import { NovaScoreCard } from "@/features/dashboard/components/nova-score-card";
import { buildDayScore } from "@/features/dashboard/lib/day-score";
import type { WorkoutItem, WorkoutSessionItem } from "@/features/workouts/types";
import type { CalendarDay } from "@/shared/lib/calendar-day";

const TODAY = "2026-08-13" as CalendarDay;
const WINDOW_START = "2026-02-14" as CalendarDay;

function day(offset: number): CalendarDay {
  const date = new Date("2026-08-13T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10) as CalendarDay;
}

const WORKOUTS: WorkoutItem[] = [
  {
    id: "w1",
    title: "Верх тела — тяжёлый день",
    note: null,
    category: "strength",
    weekdayMask: 0b0010101,
    createdAt: "2026-02-14T00:00:00.000Z",
    createdDay: WINDOW_START,
    archivedAt: null,
    exercises: [
      {
        id: "e1",
        name: "Жим лёжа",
        targetSets: 5,
        targetReps: 5,
        targetWeightKg: 92.5,
        restSeconds: 180,
        note: null,
        position: 0,
        archivedAt: null,
      },
      {
        id: "e2",
        name: "Тяга штанги в наклоне",
        targetSets: 4,
        targetReps: 8,
        targetWeightKg: 80,
        restSeconds: 120,
        note: null,
        position: 1,
        archivedAt: null,
      },
    ],
  },
  {
    id: "w2",
    title: "Кардио",
    note: null,
    category: "cardio",
    weekdayMask: 0b0101010,
    createdAt: "2026-02-14T00:00:00.000Z",
    createdDay: WINDOW_START,
    archivedAt: null,
    exercises: [],
  },
  {
    id: "w3",
    title: "Мобилити",
    note: null,
    category: "mobility",
    weekdayMask: 0,
    createdAt: "2026-02-14T00:00:00.000Z",
    createdDay: WINDOW_START,
    archivedAt: null,
    exercises: [],
  },
];

/** Полгода тренировок с крупными весами — худший случай для ширины чисел. */
const SESSIONS: WorkoutSessionItem[] = Array.from({ length: 120 }, (_, index) => {
  const offset = -index * 1.5;
  const workout = WORKOUTS[index % 3];

  return {
    id: `s${index}`,
    workoutId: workout.id,
    day: day(Math.floor(offset)),
    completedAt: "2026-08-13T18:00:00.000Z",
    note: null,
    sets:
      workout.exercises.length === 0
        ? []
        : workout.exercises.flatMap((exercise) =>
            Array.from({ length: exercise.targetSets }, (__, position) => ({
              exerciseId: exercise.id,
              position,
              reps: exercise.targetReps,
              weightKg: exercise.targetWeightKg ?? 0,
            })),
          ),
  };
});

const DAY_SCORE = buildDayScore({
  nutrition: { calories: 1850, caloriesGoal: 2200, waterMl: 1200, waterGoalMl: 2500 },
  workout: { plannedToday: 2, doneToday: 1 },
  sleep: { lastNightMin: 500, normMin: 480 },
});

export default function UiCheckPage() {
  return (
    <PageContainer className="flex flex-col gap-4">

      <HealthSectionTabs active="workouts" />

      <PageHeader
        title="Тренировки"
        subtitle="Программы и прогресс"
        actions={
          <>
            <Button size="icon" variant="secondary" aria-label="Подобрать программу">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" aria-label="Новая тренировка">
              <Plus className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <WorkoutsTabs tab="stats" onChange={() => {}} />

      <WorkoutsStatsCard
        workouts={WORKOUTS}
        sessions={SESSIONS}
        today={TODAY}
        windowStart={WINDOW_START}
      />

      <NovaScoreCard day={DAY_SCORE} />
    </PageContainer>
  );
}
