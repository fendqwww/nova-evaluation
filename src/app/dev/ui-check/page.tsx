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
 * В прод не попадает — теперь по-настоящему. Раньше здесь было написано ровно
 * это же, а основанием служило «ни одна ссылка сюда не ведёт»: маршрут
 * собирался вместе с остальными и открывался по прямому адресу у кого угодно.
 * Отсутствие ссылки — не ограничение доступа. Проверку делает app/dev/layout.tsx,
 * общий для всего каталога.
 */

import { Home, HeartPulse, User, UtensilsCrossed } from "lucide-react";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { PlanSectionTabs } from "@/components/plan-section-tabs";
import { NutritionTabs } from "@/features/nutrition/components/nutrition-tabs";
import { AppearanceTabs } from "@/features/appearance/components/appearance-tabs";
import { BottomNavigation } from "@/shared/ui/bottom-navigation";
import { ExerciseIllustration } from "@/features/workouts/components/exercise-illustration";
import { MuscleMap } from "@/features/workouts/components/muscle-map";
import { GROUP_LABELS, type MuscleGroup } from "@/features/workouts/lib/exercise-visual";
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

const NAV_ITEMS = [
  { key: "home", label: "Сегодня", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  {
    key: "nutrition",
    label: "Питание",
    href: "/nutrition",
    icon: <UtensilsCrossed className="h-4.5 w-4.5" />,
  },
  { key: "health", label: "Здоровье", href: "/workouts", icon: <HeartPulse className="h-4.5 w-4.5" /> },
  { key: "coach", label: "Коуч", href: "/coach", icon: <Sparkles className="h-4.5 w-4.5" /> },
  { key: "profile", label: "Профиль", href: "/profile", icon: <User className="h-4.5 w-4.5" /> },
];

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
      <NutritionTabs tab="stats" onChange={() => {}} />
      <AppearanceTabs tab="progress" onChange={() => {}} />
      <PlanSectionTabs active="habits" />

      <div className="relative h-20">
        <BottomNavigation items={NAV_ITEMS} />
      </div>

      <WorkoutsStatsCard
        workouts={WORKOUTS}
        sessions={SESSIONS}
        today={TODAY}
        windowStart={WINDOW_START}
      />

      <NovaScoreCard day={DAY_SCORE} />

      {/* По одному упражнению на каждую группу мышц плюс два случая без
          справочника: свободный ввод, который разбирается по словам, и
          название, которое не разбирается вовсе. Ровно те состояния, в которых
          ExerciseIllustration может ошибиться. */}
      <div className="flex flex-col gap-2">
        {[
          "Жим лёжа",
          "Подтягивания",
          "Приседания со штангой",
          "Махи в стороны",
          "Подъём штанги на бицепс",
          "Французский жим",
          "Ягодичный мостик",
          "Планка",
          "Беговая дорожка",
          "Жим узким хватом",
          "Отжимания на брусьях",
          "Шраги со штангой",
          "Жим гантелей 30 градусов",
          "Моё упражнение",
        ].map((name) => (
          <div
            key={name}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-inset p-2.5"
          >
            <ExerciseIllustration name={name} size="sm" />
            <span className="text-caption text-foreground">{name}</span>
          </div>
        ))}
      </div>

      <p className="text-section text-subtle-foreground">Схемы мышц крупно</p>

      <div className="grid grid-cols-5 gap-2">
        {MUSCLE_GROUPS.map((group) => (
          <div key={group} className="flex flex-col items-center gap-1">
            <div className="flex h-20 w-full items-center justify-center rounded-xl bg-fill-subtle p-1.5">
              <MuscleMap group={group} className="h-full w-auto" />
            </div>
            <span className="text-nano text-subtle-foreground">{GROUP_LABELS[group]}</span>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "cardio",
  "fullBody",
];
