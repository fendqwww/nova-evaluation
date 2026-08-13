"use client";

import { SegmentedTabs } from "@/shared/ui/segmented-tabs";

export type AppearanceTabId = "today" | "routines" | "photos" | "progress";

const TABS = [
  { id: "today", label: "Сегодня" },
  { id: "routines", label: "Уход" },
  { id: "photos", label: "Фото" },
  { id: "progress", label: "Прогресс" },
] as const satisfies ReadonlyArray<{ id: AppearanceTabId; label: string }>;

/**
 * Four surfaces, one section — same control every other section uses, and for
 * the same reason: today's checklist, the library of procedures, the photo
 * history and the longer-term picture are different questions, and stacking
 * them on one scroll would bury tonight's routine under a year of photos.
 */
export function AppearanceTabs({
  tab,
  onChange,
}: {
  tab: AppearanceTabId;
  onChange: (tab: AppearanceTabId) => void;
}) {
  return (
    <SegmentedTabs
      options={TABS}
      value={tab}
      onChange={onChange}
      layoutId="appearance-tab-active"
      ariaLabel="Разделы внешности"
    />
  );
}
