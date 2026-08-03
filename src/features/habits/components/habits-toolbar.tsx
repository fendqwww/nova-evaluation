"use client";

import { ArrowUpDown, Search, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
  HABIT_FILTERS,
  HABIT_SORTS,
  type HabitFilterId,
  type HabitSortId,
} from "@/features/habits/lib/collection";

/**
 * Search, sort and filter in two dense rows — the same control surface Goals
 * uses, so moving between the two sections never means relearning the header.
 *
 * The filter chips carry their counts: the number is the whole reason to look
 * at a filter before tapping it, and it turns the row into a status read-out
 * rather than a set of blind buttons.
 */
export function HabitsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  counts,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  sort: HabitSortId;
  onSortChange: (value: HabitSortId) => void;
  filter: HabitFilterId;
  onFilterChange: (value: HabitFilterId) => void;
  counts: Record<HabitFilterId, number>;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Поиск привычки"
            aria-label="Поиск по названию"
            className="h-10 w-full rounded-xl border border-border bg-input pl-9 pr-9 text-body text-foreground transition-[border-color,box-shadow] duration-200 placeholder:text-subtle-foreground focus-visible:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Очистить поиск"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle-foreground transition-colors duration-200 active:bg-white/6 active:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* A native select on purpose: it opens the platform picker on mobile,
            which beats any custom sheet for a four-option choice. */}
        <div className="relative shrink-0">
          <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground" />
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as HabitSortId)}
            aria-label="Сортировка"
            className="h-10 rounded-xl border border-border bg-input pl-8 pr-2 text-caption font-medium text-foreground transition-colors duration-200 focus-visible:border-accent-border focus-visible:outline-none"
          >
            {HABIT_SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
        {HABIT_FILTERS.map((option) => {
          const isSelected = option.id === filter;
          const count = counts[option.id];

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onFilterChange(option.id)}
              aria-pressed={isSelected}
              className={cn(
                "press-sm flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-caption font-medium transition-colors duration-200",
                isSelected
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground active:border-border-strong",
              )}
            >
              {option.label}
              <span
                className={cn(
                  "numeric text-[0.6875rem] font-semibold",
                  isSelected
                    ? "text-accent-foreground/70"
                    : count > 0
                      ? "text-foreground"
                      : "text-subtle-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
