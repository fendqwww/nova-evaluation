"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import type { CalendarDay } from "@/shared/lib/calendar-day";
import { RoutineCard } from "@/features/appearance/components/routine-card";
import { AREA_ICONS } from "@/features/appearance/lib/icons";
import { areaLabel, offeredPresets, type RoutinePreset } from "@/features/appearance/lib/areas";
import type { CareArea, CareRoutineItem } from "@/features/appearance/types";

/**
 * The whole library of procedures, filtered by area.
 *
 * The filter row only lists areas the user actually has routines in, so it
 * starts as a single "Все" chip and grows with them — a row of seven empty
 * categories would be a menu of things that do not exist yet.
 *
 * Archived routines are shown, under their own heading and dimmed. They are the
 * record of care that really happened, and hiding them would make the history
 * tab reference routines the user can no longer find.
 */
export function RoutinesList({
  routines,
  gender,
  today,
  windowStart,
  onCreate,
  onCreateFromPreset,
  onToggleRoutine,
  onToggleStep,
  onOpenMenu,
}: {
  routines: CareRoutineItem[];
  gender: string;
  today: CalendarDay;
  windowStart: CalendarDay;
  onCreate: () => void;
  onCreateFromPreset: (preset: RoutinePreset) => void;
  onToggleRoutine: (routineId: string, isDone: boolean) => void;
  onToggleStep: (stepId: string, isDone: boolean) => void;
  onOpenMenu: (routine: CareRoutineItem) => void;
}) {
  const [area, setArea] = useState<CareArea | "all">("all");

  const active = routines.filter((routine) => routine.archivedAt === null);
  const archived = routines.filter((routine) => routine.archivedAt !== null);

  const presentAreas = [...new Set(active.map((routine) => routine.area))];
  const visible = area === "all" ? active : active.filter((routine) => routine.area === area);

  if (routines.length === 0) {
    return <RoutinePresets gender={gender} onCreate={onCreate} onPick={onCreateFromPreset} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {presentAreas.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          <FilterChip label="Все" active={area === "all"} onClick={() => setArea("all")} />
          {presentAreas.map((option) => (
            <FilterChip
              key={option}
              label={areaLabel(option)}
              active={area === option}
              onClick={() => setArea(option)}
            />
          ))}
        </div>
      )}

      <Button variant="secondary" className="w-full" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Новая процедура
      </Button>

      {visible.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<Sparkles className="h-5 w-5" />}
          title="В этой зоне пока пусто"
          description="Добавьте процедуру — она появится в списке на сегодня."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              day={today}
              today={today}
              windowStart={windowStart}
              onToggleRoutine={(isDone) => onToggleRoutine(routine.id, isDone)}
              onToggleStep={onToggleStep}
              onOpenMenu={() => onOpenMenu(routine)}
            />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-2">
          <p className="text-caption font-medium text-subtle-foreground">Архив</p>
          {archived.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              day={today}
              today={today}
              windowStart={windowStart}
              onToggleRoutine={(isDone) => onToggleRoutine(routine.id, isDone)}
              onToggleStep={onToggleStep}
              onOpenMenu={() => onOpenMenu(routine)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press-sm shrink-0 rounded-lg border px-3 py-1.5 text-caption font-medium transition-colors duration-200",
        active
          ? "border-accent-border bg-accent-muted text-accent"
          : "border-border text-subtle-foreground active:border-border-strong",
      )}
    >
      {label}
    </button>
  );
}

/**
 * The empty state, and the only place presets appear.
 *
 * A first-time user staring at "добавьте процедуру" has to invent a skincare
 * routine from nothing; a tap on "Вечерний уход за кожей" opens the form with
 * four sensible steps already in it. Nothing is written until they save — see
 * the note on ROUTINE_PRESETS.
 */
function RoutinePresets({
  gender,
  onCreate,
  onPick,
}: {
  gender: string;
  onCreate: () => void;
  onPick: (preset: RoutinePreset) => void;
}) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <EmptyState
        icon={<Sparkles className="h-5 w-5" />}
        title="Ухода пока нет"
        description="Начните с готовой процедуры — всё можно поменять перед сохранением."
      />

      <div className="flex flex-col gap-2">
        {offeredPresets(gender).map((preset) => {
          const Icon = AREA_ICONS[preset.area];

          return (
            <button
              key={preset.title}
              type="button"
              onClick={() => onPick(preset)}
              className="press-sm glass-card flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left active:border-border-strong"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-white/[0.06] text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-medium text-foreground">
                  {preset.title}
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  {preset.steps.join(" · ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <Button variant="secondary" className="w-full" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Своя процедура
      </Button>
    </div>
  );
}
