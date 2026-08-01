"use client";

import { useState } from "react";
import { Camera, Clock, Moon, Plus, Sparkles, Sun } from "lucide-react";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { useAppearance } from "@/features/appearance/hooks/use-appearance";
import { AppearanceSkeleton } from "@/features/appearance/components/appearance-skeleton";
import {
  AppearanceTabs,
  type AppearanceTabId,
} from "@/features/appearance/components/appearance-tabs";
import { DayNavigator } from "@/features/appearance/components/day-navigator";
import { CareSummaryCard } from "@/features/appearance/components/care-summary-card";
import { RoutineCard } from "@/features/appearance/components/routine-card";
import { RoutinesList } from "@/features/appearance/components/routines-list";
import { RoutineFormModal } from "@/features/appearance/components/routine-form-modal";
import { RoutineMenuModal } from "@/features/appearance/components/routine-menu-modal";
import { CareMonthCalendar } from "@/features/appearance/components/care-month-calendar";
import { PhotoGallery } from "@/features/appearance/components/photo-gallery";
import { PhotoAddModal } from "@/features/appearance/components/photo-add-modal";
import { PhotoViewerModal } from "@/features/appearance/components/photo-viewer-modal";
import { PhotoCompareModal } from "@/features/appearance/components/photo-compare-modal";
import { CareGoalsList } from "@/features/appearance/components/care-goals-list";
import { CareGoalFormModal } from "@/features/appearance/components/care-goal-form-modal";
import { CareStatsCard } from "@/features/appearance/components/care-stats-card";
import { CareHistoryList } from "@/features/appearance/components/care-history-list";
import { TIME_ORDER } from "@/features/appearance/lib/icons";
import type { RoutinePreset } from "@/features/appearance/lib/areas";
import { TIME_LABELS } from "@/features/appearance/schemas";
import type {
  CareArea,
  CareGoalItem,
  CarePhotoItem,
  CareRoutineItem,
  CareTime,
} from "@/features/appearance/types";

/**
 * NOTE ON WHAT THIS SECTION DOES NOT DO. There is no skin analysis, no product
 * database and no recommendation engine — nothing here claims to know what a
 * face needs. This section records care that happened and shows what changed,
 * which is a claim it can actually back up; anything more would be medical
 * advice dressed as a feature, and this app is not qualified to give it. The
 * same call NutritionView makes about a shared food database, one level up in
 * seriousness.
 *
 * Photos never leave the account. They are stored inline in the user's own row
 * and are read back only by the actions in this feature, which is why the
 * capture modal can say so plainly.
 */
export function AppearanceView() {
  const {
    routines,
    photos,
    goals,
    gender,
    today,
    windowStart,
    isPending,
    isError,
    retry,
    setRoutineDone,
    setStepDone,
    createRoutine,
    updateRoutine,
    setRoutineArchived,
    deleteRoutine,
    createPhoto,
    deletePhoto,
    createGoal,
    updateGoal,
    setGoalCompleted,
    deleteGoal,
  } = useAppearance();

  const [tab, setTab] = useState<AppearanceTabId>("today");
  const [day, setDay] = useState<CalendarDay | null>(null);

  const [routineFormOpen, setRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<CareRoutineItem | null>(null);
  const [pendingPreset, setPendingPreset] = useState<RoutinePreset | null>(null);
  const [menuRoutine, setMenuRoutine] = useState<CareRoutineItem | null>(null);

  const [photoAddOpen, setPhotoAddOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<CarePhotoItem | null>(null);
  const [compareArea, setCompareArea] = useState<CareArea | null>(null);

  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CareGoalItem | null>(null);

  // Modal state is seeded from props on mount, never re-synced by an effect, so
  // every open has to be a fresh mount — these keys are what force one.
  const [routineFormKey, setRoutineFormKey] = useState(0);
  const [photoKey, setPhotoKey] = useState(0);
  const [compareKey, setCompareKey] = useState(0);
  const [goalFormKey, setGoalFormKey] = useState(0);

  const activeDay = day ?? today;
  const active = routines.filter((routine) => routine.archivedAt === null);

  function openCreateRoutine(preset: RoutinePreset | null) {
    setEditingRoutine(null);
    setPendingPreset(preset);
    setRoutineFormKey((n) => n + 1);
    setRoutineFormOpen(true);
  }

  function openEditRoutine(routine: CareRoutineItem) {
    setMenuRoutine(null);
    setEditingRoutine(routine);
    setPendingPreset(null);
    setRoutineFormKey((n) => n + 1);
    setRoutineFormOpen(true);
  }

  function openCreateGoal() {
    setEditingGoal(null);
    setGoalFormKey((n) => n + 1);
    setGoalFormOpen(true);
  }

  function openEditGoal(goal: CareGoalItem) {
    setEditingGoal(goal);
    setGoalFormKey((n) => n + 1);
    setGoalFormOpen(true);
  }

  function openCompare(area: CareArea) {
    setCompareArea(area);
    setCompareKey((n) => n + 1);
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <HealthSectionTabs active="appearance" />

      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            Внешность
          </h1>
          <p className="text-caption text-muted-foreground">
            Ежедневный уход и то, что он меняет
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            aria-label="Добавить фото"
            onClick={() => {
              setPhotoKey((n) => n + 1);
              setPhotoAddOpen(true);
            }}
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            aria-label="Новая процедура"
            onClick={() => openCreateRoutine(null)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {isPending && <AppearanceSkeleton />}

      {isError && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Не удалось загрузить раздел"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && (
        <>
          <AppearanceTabs tab={tab} onChange={setTab} />

          {tab === "today" && (
            <>
              <DayNavigator
                day={activeDay}
                today={today}
                windowStart={windowStart}
                onChange={setDay}
              />

              <CareSummaryCard
                routines={routines}
                day={activeDay}
                today={today}
                windowStart={windowStart}
              />

              {active.length === 0 ? (
                <EmptyState
                  className="py-10"
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Ухода пока нет"
                  description="Добавьте первую процедуру — она появится в списке на каждый день."
                  action={
                    <Button size="lg" onClick={() => setTab("routines")}>
                      Настроить уход
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {TIME_ORDER.map((time) => {
                    const inGroup = active.filter((routine) => routine.timeOfDay === time);
                    if (inGroup.length === 0) return null;

                    return (
                      <section key={time} className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 text-subtle-foreground">
                          <TimeIcon time={time} />
                          <span className="text-caption font-medium">{TIME_LABELS[time]}</span>
                        </div>

                        {inGroup.map((routine) => (
                          <RoutineCard
                            key={routine.id}
                            routine={routine}
                            day={activeDay}
                            today={today}
                            windowStart={windowStart}
                            onToggleRoutine={(isDone) =>
                              setRoutineDone(routine.id, activeDay, isDone)
                            }
                            onToggleStep={(stepId, isDone) =>
                              setStepDone(stepId, activeDay, isDone)
                            }
                            onOpenMenu={() => setMenuRoutine(routine)}
                          />
                        ))}
                      </section>
                    );
                  })}
                </div>
              )}

              {active.length > 0 && (
                <Card>
                  <div className="p-4">
                    <CareMonthCalendar
                      routines={routines}
                      today={today}
                      windowStart={windowStart}
                      selectedDay={activeDay}
                      onSelectDay={setDay}
                    />
                  </div>
                </Card>
              )}
            </>
          )}

          {tab === "routines" && (
            <RoutinesList
              routines={routines}
              gender={gender}
              today={today}
              windowStart={windowStart}
              onCreate={() => openCreateRoutine(null)}
              onCreateFromPreset={(preset) => openCreateRoutine(preset)}
              onToggleRoutine={(routineId, isDone) => setRoutineDone(routineId, today, isDone)}
              onToggleStep={(stepId, isDone) => setStepDone(stepId, today, isDone)}
              onOpenMenu={setMenuRoutine}
            />
          )}

          {tab === "photos" && (
            <PhotoGallery
              photos={photos}
              today={today}
              onAdd={() => {
                setPhotoKey((n) => n + 1);
                setPhotoAddOpen(true);
              }}
              onOpen={setViewingPhoto}
              onCompare={openCompare}
            />
          )}

          {tab === "progress" && (
            <div className="flex flex-col gap-5">
              <CareStatsCard routines={routines} photos={photos} today={today} />

              <section className="flex flex-col gap-2.5">
                <h2 className="text-caption font-medium text-subtle-foreground">
                  Цели по внешности
                </h2>
                <CareGoalsList
                  goals={goals}
                  routines={routines}
                  today={today}
                  windowStart={windowStart}
                  onCreate={openCreateGoal}
                  onEdit={openEditGoal}
                  onToggleCompleted={setGoalCompleted}
                  onDelete={(goalId) => void deleteGoal(goalId)}
                />
              </section>

              <section className="flex flex-col gap-2.5">
                <h2 className="text-caption font-medium text-subtle-foreground">
                  История изменений
                </h2>
                <CareHistoryList
                  routines={routines}
                  photos={photos}
                  goals={goals}
                  today={today}
                  windowStart={windowStart}
                  onOpenPhoto={setViewingPhoto}
                />
              </section>
            </div>
          )}
        </>
      )}

      <RoutineFormModal
        key={`routine-form-${routineFormKey}`}
        routine={editingRoutine}
        preset={pendingPreset}
        gender={gender}
        open={routineFormOpen}
        onOpenChange={setRoutineFormOpen}
        onCreate={createRoutine}
        onUpdate={updateRoutine}
      />

      <RoutineMenuModal
        routine={menuRoutine}
        today={today}
        windowStart={windowStart}
        open={menuRoutine !== null}
        onOpenChange={(next) => !next && setMenuRoutine(null)}
        onEdit={() => menuRoutine && openEditRoutine(menuRoutine)}
        onArchive={(isArchived) =>
          menuRoutine && setRoutineArchived(menuRoutine.id, isArchived)
        }
        onDelete={() => deleteRoutine(menuRoutine?.id ?? "")}
      />

      <PhotoAddModal
        key={`photo-add-${photoKey}`}
        day={activeDay}
        defaultArea="skin"
        gender={gender}
        open={photoAddOpen}
        onOpenChange={setPhotoAddOpen}
        onCreate={createPhoto}
      />

      <PhotoViewerModal
        photo={viewingPhoto}
        today={today}
        open={viewingPhoto !== null}
        onOpenChange={(next) => !next && setViewingPhoto(null)}
        onDelete={deletePhoto}
      />

      <PhotoCompareModal
        key={`compare-${compareKey}`}
        photos={photos}
        area={compareArea}
        today={today}
        open={compareArea !== null}
        onOpenChange={(next) => !next && setCompareArea(null)}
      />

      <CareGoalFormModal
        key={`goal-form-${goalFormKey}`}
        goal={editingGoal}
        gender={gender}
        open={goalFormOpen}
        onOpenChange={setGoalFormOpen}
        onCreate={createGoal}
        onUpdate={updateGoal}
      />
    </PageContainer>
  );
}

function TimeIcon({ time }: { time: CareTime }) {
  if (time === "morning") return <Sun className="h-3.5 w-3.5" />;
  if (time === "evening") return <Moon className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}
