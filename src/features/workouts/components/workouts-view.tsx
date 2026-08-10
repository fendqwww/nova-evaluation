"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Plus, SearchX, Sparkles } from "lucide-react";
import { HealthSectionTabs } from "@/components/health-section-tabs";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { useWorkouts } from "@/features/workouts/hooks/use-workouts";
import { WorkoutCard } from "@/features/workouts/components/workout-card";
import { TodayWorkoutCard } from "@/features/workouts/components/today-workout-card";
import { WorkoutFormModal } from "@/features/workouts/components/workout-form-modal";
import { WorkoutDetailModal } from "@/features/workouts/components/workout-detail-modal";
import { WorkoutSessionModal } from "@/features/workouts/components/workout-session-modal";
import { ProgramBuilderModal } from "@/features/workouts/components/program-builder-modal";
import { WorkoutHistoryList } from "@/features/workouts/components/workout-history-list";
import { WorkoutsStatsCard } from "@/features/workouts/components/workouts-stats-card";
import { WorkoutsSkeleton } from "@/features/workouts/components/workouts-skeleton";
import { WorkoutsToolbar } from "@/features/workouts/components/workouts-toolbar";
import { WorkoutsTabs, type WorkoutsTabId } from "@/features/workouts/components/workouts-tabs";
import {
  WORKOUT_FILTERS,
  countByFilter,
  matchesFilter,
  matchesSearch,
  sortWorkouts,
  type WorkoutFilterId,
  type WorkoutSortId,
} from "@/features/workouts/lib/collection";
import { overallStats, sessionsOf } from "@/features/workouts/lib/stats";
import type { WorkoutItem } from "@/features/workouts/types";

/**
 * NOTE ON WHAT THIS SECTION DOES NOT DO. There is no exercise library and no
 * rest-day notifications. A library means shipping and maintaining a catalogue
 * of movements in Russian that would be wrong for half the people using it, and
 * a free-text field they already fill in once per programme is not the
 * bottleneck. Notifications need a Telegram bot send loop and a scheduler,
 * neither of which exists in this app — and a reminder toggle that silently
 * does nothing would be worse than no toggle. The plan on the card and the
 * "На сегодня" filter are the honest substitutes.
 */
export function WorkoutsView() {
  const {
    workouts,
    sessions,
    today,
    windowStart,
    isPending,
    isError,
    retry,
    refresh,
    setSessionCompleted,
    startSession,
    isStarting,
    setLogged,
  } = useWorkouts();

  const [tab, setTab] = useState<WorkoutsTabId>("plan");
  const [filter, setFilter] = useState<WorkoutFilterId>("today");
  const [sort, setSort] = useState<WorkoutSortId>("recent");
  const [query, setQuery] = useState("");

  const [isFormOpen, setFormOpen] = useState(false);
  const [isBuilderOpen, setBuilderOpen] = useState(false);
  const [builderKey, setBuilderKey] = useState(0);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutItem | null>(null);
  // Open rows are tracked by id, not by value: the modals then read the live
  // row every render, so an optimistically logged set shows up inside the sheet
  // instead of only in the list behind it.
  const [detailWorkoutId, setDetailWorkoutId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Both modals are remounted per opening via a bumped key, so their fields
  // start from the row they were opened for. Re-seeding state from props inside
  // a useEffect would cascade an extra render and is what
  // react-hooks/set-state-in-effect exists to catch.
  const [formKey, setFormKey] = useState(0);
  const [detailKey, setDetailKey] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const counts = useMemo(
    () =>
      WORKOUT_FILTERS.reduce(
        (acc, option) => {
          acc[option.id] = countByFilter(workouts, sessions, option.id, today, windowStart);
          return acc;
        },
        {} as Record<WorkoutFilterId, number>,
      ),
    [workouts, sessions, today, windowStart],
  );

  const summary = useMemo(
    () => overallStats(workouts, sessions, today, windowStart),
    [workouts, sessions, today, windowStart],
  );

  const visible = useMemo(
    () =>
      sortWorkouts(
        workouts.filter(
          (workout) =>
            matchesFilter(workout, sessions, filter, today, windowStart) &&
            matchesSearch(workout, query),
        ),
        sessions,
        sort,
        today,
        windowStart,
      ),
    [workouts, sessions, filter, query, sort, today, windowStart],
  );

  const detailWorkout = workouts.find((workout) => workout.id === detailWorkoutId) ?? null;
  const openSession = sessions.find((session) => session.id === sessionId) ?? null;
  const sessionWorkout = openSession
    ? (workouts.find((workout) => workout.id === openSession.workoutId) ?? null)
    : null;

  // The session before the open one, for the same workout — what each set's
  // starting numbers are seeded from.
  const previousSession = useMemo(() => {
    if (!openSession) return null;
    return (
      sessionsOf(sessions, openSession.workoutId)
        .filter((item) => item.day < openSession.day && item.completedAt !== null)
        .at(-1) ?? null
    );
  }, [sessions, openSession]);

  const hasWorkouts = workouts.length > 0;

  function openCreate() {
    setEditingWorkout(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function openBuilder() {
    setBuilderKey((n) => n + 1);
    setBuilderOpen(true);
  }

  function openDetail(workoutId: string) {
    setDetailWorkoutId(workoutId);
    setDetailKey((n) => n + 1);
  }

  function openEditFromDetail() {
    setEditingWorkout(detailWorkout);
    setDetailWorkoutId(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function openSessionById(id: string) {
    setSessionId(id);
    setSessionKey((n) => n + 1);
  }

  /**
   * Start today's session, or reopen the one already in progress.
   *
   * Awaited rather than fired and forgotten: the runner is addressed by session
   * id, and opening the sheet before the id exists would give it nothing to
   * write sets to.
   */
  async function start(workoutId: string, day: CalendarDay) {
    const existing = sessions.find(
      (session) => session.workoutId === workoutId && session.day === day,
    );
    if (existing) {
      openSessionById(existing.id);
      return;
    }

    try {
      const result = await startSession(workoutId, day);
      openSessionById(result.sessionId);
    } catch {
      // The snapshot is unchanged, so the card stays exactly as it was and the
      // next tap tries again. Nothing partial was written.
    }
  }

  // Заголовок «Тренировка идёт / N на сегодня / отдых» жил здесь и дублировал
  // то, что TodayWorkoutCard выводит из тех же workoutStats. Одна формулировка
  // на один факт — иначе две строки об одном дне рано или поздно разойдутся.

  return (
    <PageContainer className="flex flex-col gap-4">
      <HealthSectionTabs active="workouts" />

      <PageHeader
        title="Тренировки"
        subtitle="Программы и прогресс"
        actions={
          <>
            {/* Подбор доступен и тем, у кого программы уже есть: смена цели или
                выход из плато — это новая программа, а не правка старой. */}
            <Button
              size="icon"
              variant="secondary"
              aria-label="Подобрать программу"
              onClick={openBuilder}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button size="icon" aria-label="Новая тренировка" onClick={openCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {isPending && <WorkoutsSkeleton />}

      {isError && (
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="Тренировки не загрузились"
          description="Проверь соединение — данные никуда не делись."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {/* Пустое состояние ведёт в подбор, а не в конструктор.
          Человек, у которого нет ни одной программы, чаще всего не знает не как
          создать тренировку, а какую именно: экран с пустой формой и полем
          «название» — это тест, который он проваливает. Ручное создание осталось
          рядом второй кнопкой для тех, у кого план уже в голове. */}
      {!isPending && !isError && !hasWorkouts && (
        <EmptyState
          className="py-12"
          icon={<Dumbbell className="h-5 w-5" />}
          title="Не знаешь, какую программу выбрать?"
          description="Ответь на три вопроса — цель, уровень, оборудование — и Nova соберёт план на неделю по твоим данным."
          action={
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={openBuilder}>
                <Sparkles className="h-4 w-4" />
                Подобрать программу
              </Button>
              <Button variant="ghost" size="md" onClick={openCreate}>
                Создать вручную
              </Button>
            </div>
          }
        />
      )}

      {!isPending && !isError && hasWorkouts && (
        <>
          <WorkoutsTabs tab={tab} onChange={setTab} />

          {tab === "plan" && (
            <>
              {/* Тренировка дня, а не сводка за неделю.
                  Экран открывался кольцом «2 из 4 на неделе» — числом, которое
                  ничего не предлагает сделать. Человек заходит в раздел
                  тренировок с одним вопросом: «что у меня сегодня и как это
                  начать». TodayWorkoutCard отвечает на него названием
                  программы и кнопкой старта, а недельный прогресс остался у
                  него внизу — ничего не потеряно, изменился приоритет. */}
              <TodayWorkoutCard
                workouts={workouts}
                sessions={sessions}
                today={today}
                windowStart={windowStart}
                weekDone={summary.weekDone}
                weekTarget={summary.weekTarget}
                isStarting={isStarting}
                onStart={(workoutId) => void start(workoutId, today)}
                onOpen={openDetail}
              />

              <WorkoutsToolbar
                query={query}
                onQueryChange={setQuery}
                sort={sort}
                onSortChange={setSort}
                filter={filter}
                onFilterChange={setFilter}
                counts={counts}
              />

              {visible.length === 0 ? (
                <EmptyState
                  className="py-10"
                  icon={<SearchX className="h-5 w-5" />}
                  title={
                    query.trim()
                      ? "Ничего не найдено"
                      : filter === "today" && counts.all > 0
                        ? "На сегодня всё закрыто"
                        : "Здесь пока пусто"
                  }
                  description={
                    query.trim()
                      ? "Попробуй другой запрос или сними фильтр."
                      : filter === "today" && counts.all > 0
                        ? `В работе ${counts.all} ${pluralizeRu(counts.all, [
                            "тренировка",
                            "тренировки",
                            "тренировок",
                          ])} — загляните завтра.`
                        : "В этом фильтре нет тренировок."
                  }
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      Показать все
                    </Button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visible.map((workout) => (
                      <motion.div
                        key={workout.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 320, damping: 34 }}
                      >
                        <WorkoutCard
                          workout={workout}
                          sessions={sessions}
                          today={today}
                          windowStart={windowStart}
                          onStart={() => void start(workout.id, today)}
                          onOpen={() => openDetail(workout.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {tab === "history" && (
            <WorkoutHistoryList
              workouts={workouts}
              sessions={sessions}
              today={today}
              onOpenSession={openSessionById}
            />
          )}

          {tab === "stats" && (
            <WorkoutsStatsCard
              workouts={workouts}
              sessions={sessions}
              today={today}
              windowStart={windowStart}
            />
          )}
        </>
      )}

      <ProgramBuilderModal
        key={`builder-${builderKey}`}
        open={isBuilderOpen}
        onOpenChange={setBuilderOpen}
        onCreated={refresh}
      />

      <WorkoutFormModal
        key={`form-${formKey}`}
        workout={editingWorkout}
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />

      <WorkoutDetailModal
        key={`detail-${detailKey}`}
        workout={detailWorkout}
        sessions={sessions}
        today={today}
        windowStart={windowStart}
        open={detailWorkoutId !== null}
        onOpenChange={(next) => !next && setDetailWorkoutId(null)}
        onEdit={openEditFromDetail}
        onStart={() => {
          if (!detailWorkout) return;
          setDetailWorkoutId(null);
          void start(detailWorkout.id, today);
        }}
        onToggleDay={(day, isDone) => {
          if (!detailWorkout) return;
          setSessionCompleted(detailWorkout.id, day, isDone);
        }}
        onOpenSession={(id) => {
          setDetailWorkoutId(null);
          openSessionById(id);
        }}
        onChanged={refresh}
        onDeleted={() => {
          setDetailWorkoutId(null);
          refresh();
        }}
      />

      <WorkoutSessionModal
        key={`session-${sessionKey}`}
        workout={sessionWorkout}
        session={openSession}
        previousSession={previousSession}
        today={today}
        open={sessionId !== null}
        onOpenChange={(next) => !next && setSessionId(null)}
        onToggleSet={setLogged}
        onComplete={(isCompleted) => {
          if (!openSession) return;
          setSessionCompleted(openSession.workoutId, openSession.day, isCompleted);
        }}
        onChanged={refresh}
      />

      {isStarting && (
        <span className="sr-only" role="status">
          Открываем тренировку
        </span>
      )}
    </PageContainer>
  );
}
