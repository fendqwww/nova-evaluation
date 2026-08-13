"use client";

import { SegmentedTabs } from "@/shared/ui/segmented-tabs";

export type SleepTabId = "today" | "history" | "stats";

const TABS = [
  { id: "today", label: "Сегодня" },
  { id: "history", label: "История" },
  { id: "stats", label: "Статистика" },
] as const satisfies ReadonlyArray<{ id: SleepTabId; label: string }>;

/** Same control as every other section, for the same reason: the section
 *  answers three different questions on one screen. */
export function SleepTabs({
  tab,
  onChange,
}: {
  tab: SleepTabId;
  onChange: (tab: SleepTabId) => void;
}) {
  return (
    <SegmentedTabs
      options={TABS}
      value={tab}
      onChange={onChange}
      layoutId="sleep-tab-active"
      ariaLabel="Разделы сна"
    />
  );
}
