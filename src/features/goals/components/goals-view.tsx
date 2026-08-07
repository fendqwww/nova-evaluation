"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, SearchX, Target } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { useGoals } from "@/features/goals/hooks/use-goals";
import { GoalCard } from "@/features/goals/components/goal-card";
import { GoalFormModal } from "@/features/goals/components/goal-form-modal";
import { GoalDetailModal } from "@/features/goals/components/goal-detail-modal";
import { GoalsSkeleton } from "@/features/goals/components/goals-skeleton";
import { GoalsToolbar } from "@/features/goals/components/goals-toolbar";
import {
  GOAL_FILTERS,
  countByFilter,
  matchesFilter,
  matchesSearch,
  sortGoals,
  type GoalFilterId,
  type GoalSortId,
} from "@/features/goals/lib/format";
import type { GoalItem } from "@/features/goals/types";

/** How long the completion tick stays on screen before the card leaves. */
const CELEBRATION_MS = 950;

/**
 * NOTE ON PRIORITY. The status badge on each card is *derived* — deadline
 * distance first, then progress (see goalStatus in lib/format.ts). A user-set
 * priority (высокий / средний / низкий) is a different thing and cannot be built
 * from the data that exists: it needs a Goal.priority column plus a write path
 * in the create and update actions, and the current brief rules both out. The
 * derived state is what the card can honestly show today.
 */
export function GoalsView() {
  const { goals, isPending, isError, retry, refresh, setGoalCompleted, setStepDone } =
    useGoals();

  const [filter, setFilter] = useState<GoalFilterId>("active");
  const [sort, setSort] = useState<GoalSortId>("deadline");
  const [query, setQuery] = useState("");

  const [isFormOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  // The open goal is tracked by id, not by value: the detail modal then reads
  // the live row every render, so an optimistic step tick shows up inside the
  // modal instead of only in the list behind it.
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);

  // Both modals are remounted per opening via a bumped key, so their fields
  // start from the row they were opened for. The alternative — re-seeding state
  // from props inside a useEffect — cascades an extra render and is what
  // react-hooks/set-state-in-effect exists to catch.
  const [formKey, setFormKey] = useState(0);
  const [detailKey, setDetailKey] = useState(0);

  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const celebrationTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(celebrationTimer.current), []);

  const counts = useMemo(
    () =>
      GOAL_FILTERS.reduce(
        (acc, option) => {
          acc[option.id] = countByFilter(goals, option.id);
          return acc;
        },
        {} as Record<GoalFilterId, number>,
      ),
    [goals],
  );

  // A goal mid-celebration stays visible even though it no longer matches the
  // active filter — otherwise finishing one would vanish before the tick has a
  // chance to register. It is also pinned to its pre-completion sort position,
  // so the animation plays where the user is already looking instead of at the
  // bottom of the list.
  const visible = useMemo(
    () =>
      sortGoals(
        goals.filter(
          (goal) =>
            (matchesFilter(goal, filter) || goal.id === celebratingId) &&
            matchesSearch(goal, query),
        ),
        sort,
        celebratingId,
      ),
    [goals, filter, query, sort, celebratingId],
  );

  const detailGoal = goals.find((goal) => goal.id === detailGoalId) ?? null;
  const overdueCount = counts.overdue;

  function completeGoal(goalId: string, isCompleted: boolean) {
    setGoalCompleted(goalId, isCompleted);
    if (!isCompleted) return;

    setCelebratingId(goalId);
    window.clearTimeout(celebrationTimer.current);
    celebrationTimer.current = window.setTimeout(
      () => setCelebratingId(null),
      CELEBRATION_MS,
    );
  }

  function openCreate() {
    setEditingGoal(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function openDetail(goalId: string) {
    setDetailGoalId(goalId);
    setDetailKey((n) => n + 1);
  }

  function openEditFromDetail() {
    setEditingGoal(detailGoal);
    setDetailGoalId(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  const hasGoals = goals.length > 0;

  return (
    <PageContainer className="flex flex-col gap-4">
      <header className="flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            Цели
          </h1>
          {hasGoals && (
            <p className="text-caption text-muted-foreground">
              <span className="numeric">{counts.active}</span>{" "}
              {pluralizeRu(counts.active, ["активная", "активные", "активных"])}
              {overdueCount > 0 && (
                <>
                  {" · "}
                  <span className="numeric font-semibold text-destructive">
                    {overdueCount} просрочено
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <Button size="icon" aria-label="Новая цель" onClick={openCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      {isPending && <GoalsSkeleton />}

      {isError && (
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Цели не загрузились"
          description="Проверь соединение — данные никуда не делись."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && !hasGoals && (
        <EmptyState
          className="py-12"
          icon={<Target className="h-5 w-5" />}
          title="С чего начнём"
          description="Цель — это то, к чему Nova привяжет твои привычки, тренировки и задачи. Сформулируй первую."
          action={
            <Button size="lg" onClick={openCreate}>
              Создать цель
            </Button>
          }
        />
      )}

      {!isPending && !isError && hasGoals && (
        <>
          <GoalsToolbar
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
              title={query.trim() ? "Ничего не найдено" : "Здесь пока пусто"}
              description={
                query.trim()
                  ? "Попробуй другой запрос или сними фильтр."
                  : "В этом фильтре нет целей."
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
                {visible.map((goal) => (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  >
                    <GoalCard
                      goal={goal}
                      isCelebrating={goal.id === celebratingId}
                      onToggle={(isCompleted) => completeGoal(goal.id, isCompleted)}
                      onOpen={() => openDetail(goal.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <GoalFormModal
        key={`form-${formKey}`}
        goal={editingGoal}
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />

      <GoalDetailModal
        key={`detail-${detailKey}`}
        goal={detailGoal}
        open={detailGoalId !== null}
        onOpenChange={(open) => !open && setDetailGoalId(null)}
        onEdit={openEditFromDetail}
        onChanged={refresh}
        onDeleted={() => {
          setDetailGoalId(null);
          refresh();
        }}
        onStepToggle={setStepDone}
        onToggleCompleted={completeGoal}
      />
    </PageContainer>
  );
}
