"use client";

import { SegmentedTabs } from "@/shared/ui/segmented-tabs";

export type WorkoutsTabId = "plan" | "history" | "stats";

const TABS = [
  { id: "plan", label: "Программы" },
  { id: "history", label: "История" },
  { id: "stats", label: "Статистика" },
] as const satisfies ReadonlyArray<{ id: WorkoutsTabId; label: string }>;

/**
 * Three surfaces, one section.
 *
 * Goals, Habits and Tasks are each a single list, so they need no such control.
 * Training genuinely is not: the programme you follow, the log of what you did,
 * and what that log adds up to are three different questions, and stacking all
 * three on one scroll would bury the first one — the only one that is
 * actionable right now — under a month of history.
 */
export function WorkoutsTabs({
  tab,
  onChange,
}: {
  tab: WorkoutsTabId;
  onChange: (tab: WorkoutsTabId) => void;
}) {
  return (
    <SegmentedTabs
      options={TABS}
      value={tab}
      onChange={onChange}
      layoutId="workouts-tab-active"
      ariaLabel="Разделы тренировок"
    />
  );
}
