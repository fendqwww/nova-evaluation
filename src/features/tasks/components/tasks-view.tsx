"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { AnimatePresence, motion } from "framer-motion";
import { ListTodo, Plus, SearchX, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { cn } from "@/shared/lib/cn";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import { clearCompletedTasksAction } from "@/features/tasks/server/clear-completed-tasks.action";
import { TaskCard } from "@/features/tasks/components/task-card";
import { TaskFormModal } from "@/features/tasks/components/task-form-modal";
import { TaskDetailModal } from "@/features/tasks/components/task-detail-modal";
import { TasksSkeleton } from "@/features/tasks/components/tasks-skeleton";
import { TasksToolbar } from "@/features/tasks/components/tasks-toolbar";
import { groupCountClass, groupHeaderClass } from "@/features/tasks/lib/tone";
import {
  TASK_FILTERS,
  countByFilter,
  groupTasks,
  matchesFilter,
  matchesSearch,
  type TaskFilterId,
  type TaskSortId,
} from "@/features/tasks/lib/format";
import type { TaskItem } from "@/features/tasks/types";

export function TasksView() {
  const rawInitData = useRawInitData();
  const { tasks, today, isPending, isError, retry, refresh, setTaskCompleted } = useTasks();

  const [filter, setFilter] = useState<TaskFilterId>("open");
  const [sort, setSort] = useState<TaskSortId>("due");
  const [query, setQuery] = useState("");

  const [isFormOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  // The open task is tracked by id, not by value: the detail modal then reads
  // the live row every render, so an optimistic completion shows up inside the
  // modal instead of only in the list behind it.
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [isConfirmingClear, setConfirmingClear] = useState(false);

  // Both modals are remounted per opening via a bumped key, so their fields
  // start from the row they were opened for. The alternative — re-seeding state
  // from props inside a useEffect — cascades an extra render and is what
  // react-hooks/set-state-in-effect exists to catch.
  const [formKey, setFormKey] = useState(0);
  const [detailKey, setDetailKey] = useState(0);

  const clearCompleted = useMutation({
    mutationFn: clearCompletedTasksAction,
    onSuccess: () => {
      setConfirmingClear(false);
      refresh();
    },
  });

  const counts = useMemo(
    () =>
      TASK_FILTERS.reduce(
        (acc, option) => {
          acc[option.id] = countByFilter(tasks, option.id, today);
          return acc;
        },
        {} as Record<TaskFilterId, number>,
      ),
    [tasks, today],
  );

  const groups = useMemo(
    () =>
      groupTasks(
        tasks.filter(
          (task) => matchesFilter(task, filter, today) && matchesSearch(task, query),
        ),
        today,
        sort,
      ),
    [tasks, filter, query, sort, today],
  );

  const detailTask = tasks.find((task) => task.id === detailTaskId) ?? null;
  const hasTasks = tasks.length > 0;
  const visibleCount = groups.reduce((total, group) => total + group.tasks.length, 0);
  const showClearCompleted = filter === "completed" && counts.completed > 0;

  function openCreate() {
    setEditingTask(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  function openDetail(taskId: string) {
    setDetailTaskId(taskId);
    setDetailKey((n) => n + 1);
  }

  function openEditFromDetail() {
    setEditingTask(detailTask);
    setDetailTaskId(null);
    setFormKey((n) => n + 1);
    setFormOpen(true);
  }

  return (
    <PageContainer className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            Задачи
          </h1>
          {hasTasks && (
            <p className="text-caption text-muted-foreground">
              <span className="numeric">{counts.open}</span>{" "}
              {pluralizeRu(counts.open, ["активная", "активные", "активных"])}
              {counts.overdue > 0 && (
                <>
                  {" · "}
                  <span className="numeric font-semibold text-destructive">
                    {counts.overdue} просрочено
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <Button size="icon" aria-label="Новая задача" onClick={openCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      {isPending && <TasksSkeleton />}

      {isError && (
        <EmptyState
          icon={<ListTodo className="h-5 w-5" />}
          title="Не удалось загрузить задачи"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && !hasTasks && (
        <EmptyState
          className="py-12"
          icon={<ListTodo className="h-5 w-5" />}
          title="У тебя пока нет задач"
          description="Один маленький шаг сегодня — уже прогресс."
          action={
            <Button size="lg" onClick={openCreate}>
              Создать задачу
            </Button>
          }
        />
      )}

      {!isPending && !isError && hasTasks && (
        <>
          <TasksToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            filter={filter}
            onFilterChange={setFilter}
            counts={counts}
          />

          {visibleCount === 0 ? (
            <EmptyState
              className="py-10"
              icon={<SearchX className="h-5 w-5" />}
              title={
                query.trim()
                  ? "Ничего не найдено"
                  : filter === "open" || filter === "today"
                    ? "Всё закрыто"
                    : "Здесь пока пусто"
              }
              description={
                query.trim()
                  ? "Попробуйте другой запрос или снимите фильтр."
                  : filter === "open" || filter === "today"
                    ? "Ни одной активной задачи не осталось."
                    : "В этом фильтре нет задач."
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
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <div key={group.horizon} className="flex flex-col gap-2">
                  {/* The heading is the plan: grouping thirty rows under
                      Просрочено / Сегодня / Завтра is what turns a wall of
                      checkboxes into something you can act on. */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-section font-semibold",
                        groupHeaderClass(group.horizon),
                      )}
                    >
                      {group.title}
                    </span>
                    <span
                      className={cn(
                        "numeric rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                        groupCountClass(group.horizon),
                      )}
                    >
                      {group.tasks.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <AnimatePresence initial={false} mode="popLayout">
                      {group.tasks.map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 320, damping: 34 }}
                        >
                          <TaskCard
                            task={task}
                            today={today}
                            onToggle={(isCompleted) => setTaskCompleted(task.id, isCompleted)}
                            onOpen={() => openDetail(task.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}

              {showClearCompleted && (
                <div className="flex flex-col gap-2 pt-1">
                  {!isConfirmingClear ? (
                    <Button
                      variant="ghost"
                      className="w-full text-destructive"
                      onClick={() => setConfirmingClear(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Очистить выполненные
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive-muted p-3">
                      <p className="text-caption text-foreground">
                        Удалить {counts.completed}{" "}
                        {pluralizeRu(counts.completed, [
                          "выполненную задачу",
                          "выполненные задачи",
                          "выполненных задач",
                        ])}
                        ? Отменить будет нельзя.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setConfirmingClear(false)}
                        >
                          Отмена
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={clearCompleted.isPending}
                          onClick={() => clearCompleted.mutate({ rawInitData })}
                        >
                          {clearCompleted.isPending ? "Удаляем..." : "Удалить"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {clearCompleted.isError && (
                    <p className="text-caption text-destructive">
                      Не удалось очистить. Попробуйте ещё раз.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <TaskFormModal
        key={`form-${formKey}`}
        task={editingTask}
        today={today}
        open={isFormOpen}
        onOpenChange={setFormOpen}
        onSaved={refresh}
      />

      <TaskDetailModal
        key={`detail-${detailKey}`}
        task={detailTask}
        today={today}
        open={detailTaskId !== null}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        onEdit={openEditFromDetail}
        onDeleted={() => {
          setDetailTaskId(null);
          refresh();
        }}
        onToggleCompleted={setTaskCompleted}
      />
    </PageContainer>
  );
}
