"use client";

import { HabitSchedulePicker } from "@/features/habits/components/habit-schedule-picker";
import type { CareSchedule } from "@/features/appearance/types";

/**
 * Picking a routine's schedule.
 *
 * The control itself is the habits one, for exactly the reason lib/schedule.ts
 * re-exports the habits arithmetic: CareSchedule and HabitSchedule are the same
 * union over the same columns, and a second picker would be a second place for
 * "the last selected weekday cannot be turned off" to be forgotten. This
 * wrapper exists so appearance code never has to name HabitSchedule to talk
 * about a care routine.
 */
export function CareSchedulePicker({
  schedule,
  onChange,
}: {
  schedule: CareSchedule;
  onChange: (schedule: CareSchedule) => void;
}) {
  return <HabitSchedulePicker schedule={schedule} onChange={onChange} />;
}
