"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Target, Repeat, ListTodo, Sparkles, ChevronRight } from "lucide-react";
import { IconChip } from "@/shared/ui/card";

type Tone = "goal" | "habit" | "task" | "ai";

/**
 * Three creators and one destination.
 *
 * "Коуч Nova" is a Link, not an onSelect — it opens a section with its own
 * route rather than a modal the Dashboard has to own state for. The other
 * three still open the quick-capture sheet, because creating a goal from here
 * should not navigate away from the screen you were reading.
 */
interface QuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  tone: Tone;
  onSelect?: () => void;
  href?: string;
}

const TILE_CLASS =
  "press-sm group flex items-center gap-2.5 rounded-xl border border-border surface-raised px-3 py-3 text-left shadow-card edge-light active:border-border-strong";

export function QuickActions({
  onGoal,
  onHabit,
  onTask,
}: {
  onGoal: () => void;
  onHabit: () => void;
  onTask: () => void;
}) {
  const actions: QuickAction[] = [
    { key: "goal", label: "Новая цель", icon: <Target className="h-4 w-4" />, tone: "goal", onSelect: onGoal },
    { key: "habit", label: "Новая привычка", icon: <Repeat className="h-4 w-4" />, tone: "habit", onSelect: onHabit },
    { key: "task", label: "Новая задача", icon: <ListTodo className="h-4 w-4" />, tone: "task", onSelect: onTask },
    { key: "coach", label: "Коуч Nova", icon: <Sparkles className="h-4 w-4" />, tone: "ai", href: "/coach" },
  ];

  return (
    <div>
      <p className="mb-2.5 text-section text-muted-foreground">Быстрые действия</p>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => {
          const inner = (
            <>
              <IconChip tone={action.tone} size="md">
                {action.icon}
              </IconChip>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium tracking-[-0.012em] text-foreground">
                {action.label}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle-foreground transition-transform duration-200 group-active:translate-x-0.5" />
            </>
          );

          return action.href ? (
            <Link key={action.key} href={action.href} className={TILE_CLASS}>
              {inner}
            </Link>
          ) : (
            <button
              key={action.key}
              type="button"
              onClick={action.onSelect}
              className={TILE_CLASS}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
