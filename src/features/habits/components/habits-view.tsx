"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Repeat, SearchX } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PlanSectionTabs } from "@/components/plan-section-tabs";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { useAddIntent } from "@/shared/lib/use-add-intent";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { useHabits } from "@/features/habits/hooks/use-habits";
import { HabitCard } from "@/features/habits/components/habit-card";
import { HabitFormModal } from "@/features/habits/components/habit-form-modal";
import { HabitDetailModal } from "@/features/habits/components/habit-detail-modal";
import { HabitsSkeleton } from "@/features/habits/components/habits-skeleton";
import { HabitsToolbar } from "@/features/habits/components/habits-toolbar";
import {
  HABIT_FILTERS,
  countByFilter,
  matchesFilter,
  matchesSearch,
  sortHabits,
  todayProgress,
  type HabitFilterId,
  type HabitSortId,
} from "@/features/habits/lib/collection";
import type { HabitItem } from "@/features/habits/types";

/**
 * NOTE ON REMINDERS. A habit tracker invites push notifications, and this one
 * deliberately has none: delivering them means a Telegram bot send loop and a
 * scheduler, neither of which exists in this app, and a reminder toggle that
 * silently does nothing would be worse than no toggle at all. The week strip on
 * every card is the honest substitute — the fix for a forgotten day is one tap
 * away instead of one notification away.
 */
export function HabitsView() {
  const {
    habits,
    today,
    windowStart,
    isPending,
    isError,
    retry,
    refresh,
    setDayLogged,
  } = useHabits();

  const [filter, setFilter] = useState<HabitFilterId>("today");
  const [sort, setSort] = useState<HabitSortId>("streak");
  const [query, setQuery] = useState("");

  const [isFormOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  /**
   * Пришли из листа записи по «Привычка» (`/habits?add=1`) — форма создания
   * открывается сразу. Ссылка существовала и раньше, но её никто не читал:
   * кнопка в листе записи просто открывала список. См. тот же разбор в
   * GoalsView.
   */
  const addIntent = useAddIntent();
  const [intentDismissed, setIntentDismissed] = useState(false);
  // The open habit is tracked by id, not by value: the detail modal then reads
  // the live row every render, so an optimistic tick shows up inside the modal
  // instead of only in the list behind it.
  const [detailHabitId, setDetailHabitId] = useState<string | null>(null);

  // Both modals are remounted per opening via a bumped key, so their fields
  // start from the row they were opened for. The alternative — re-seeding state
  // from props inside a useEffect — cascades an extra render and is what
  // react-hooks/set-state-in-effect exists to catch.
  const [formKey, setFormKey] = useState(0);
  const [detailKey, setDetailKey] = useState(0);

  const counts = useMemo(
    () =>
      HABIT_FILTERS.reduce(
        (acc, option) => {
          acc[option.id] = countByFilter(habits, option.id, today, windowStart);
          return acc;
        },
        {} as Record<HabitFilterId, number>,
      ),
    [habits, today, windowStart],
  );

  const progress = useMemo(
    () => todayProgress(habits, today, windowStart),
    [habits, today, windowStart],
  );

  const visible = useMemo(
    () =>
      sortHabits(
        habits.filter(
          (habit) =>
            matchesFilter(habit, filter, today, windowStart) && matchesSearch(habit, query),
        ),
        sort,
        today,
        windowStart,
      ),
    [habits, filter, query, sort, today, windowStart],
  );

  const detailHabit = habits.find((habit) => habit.id === detailHabitId) ?? null;
  const hasHabits = habits.length > 0;
  const allKept = progress.total > 0 && progress.done === progress.total;

  function openCreate() {
    setEditingHabit(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function openDetail(habitId: string) {
    setDetailHabitId(habitId);
    setDetailKey((n) => n + 1);
  }

  function openEditFromDetail() {
    setEditingHabit(detailHabit);
    setDetailHabitId(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function toggleDay(habitId: string, day: CalendarDay, isDone: boolean) {
    setDayLogged(habitId, day, isDone);
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <PlanSectionTabs active="habits" />

      <PageHeader
        title="Привычки"
        subtitle={
          hasHabits &&
          (progress.total === 0 ? (
            "Сегодня ничего не запланировано"
          ) : allKept ? (
            <span className="font-semibold text-positive">Всё на сегодня выполнено</span>
          ) : (
            <>
              <span className="numeric font-semibold text-foreground">
                {progress.done} из {progress.total}
              </span>{" "}
              на сегодня
            </>
          ))
        }
        actions={
          <Button size="icon" aria-label="Новая привычка" onClick={openCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      {isPending && <HabitsSkeleton />}

      {isError && (
        <EmptyState
          icon={<Repeat className="h-5 w-5" />}
          title="Привычки не загрузились"
          description="Проверь соединение — данные никуда не делись."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && !hasHabits && (
        <EmptyState
          className="py-12"
          icon={<Repeat className="h-5 w-5" />}
          title="Здесь начинается регулярность"
          description="Одна привычка, которую ты правда будешь делать, меняет больше, чем пять идеальных. Начни с неё."
          action={
            <Button size="lg" onClick={openCreate}>
              Создать привычку
            </Button>
          }
        />
      )}

      {!isPending && !isError && hasHabits && (
        <>
          <HabitsToolbar
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
                    ? `Осталось ${counts.all} ${pluralizeRu(counts.all, [
                        "привычка",
                        "привычки",
                        "привычек",
                      ])} в работе — загляните завтра.`
                    : "В этом фильтре нет привычек."
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
                {visible.map((habit) => (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  >
                    <HabitCard
                      habit={habit}
                      today={today}
                      windowStart={windowStart}
                      onToggleDay={(day, isDone) => toggleDay(habit.id, day, isDone)}
                      onOpen={() => openDetail(habit.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <HabitFormModal
        key={`form-${formKey}`}
        habit={editingHabit}
        open={isFormOpen || (addIntent !== null && !intentDismissed)}
        onOpenChange={(next) => {
          setFormOpen(next);
          if (!next) setIntentDismissed(true);
        }}
        onSaved={refresh}
      />

      <HabitDetailModal
        key={`detail-${detailKey}`}
        habit={detailHabit}
        today={today}
        windowStart={windowStart}
        open={detailHabitId !== null}
        onOpenChange={(open) => !open && setDetailHabitId(null)}
        onEdit={openEditFromDetail}
        onChanged={refresh}
        onDeleted={() => {
          setDetailHabitId(null);
          refresh();
        }}
        onToggleDay={toggleDay}
      />
    </PageContainer>
  );
}
