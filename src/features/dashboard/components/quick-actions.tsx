"use client";

import type { ReactNode } from "react";
import { Target, Repeat, ListTodo, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { IconChip } from "@/shared/ui/card";

type Tone = "goal" | "habit" | "task" | "ai";

interface QuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  tone: Tone;
  onSelect: () => void;
}

export function QuickActions({
  onGoal,
  onHabit,
  onTask,
  onCoach,
}: {
  onGoal: () => void;
  onHabit: () => void;
  onTask: () => void;
  onCoach: () => void;
}) {
  const actions: QuickAction[] = [
    { key: "goal", label: "Новая цель", icon: <Target className="h-4 w-4" />, tone: "goal", onSelect: onGoal },
    { key: "habit", label: "Новая привычка", icon: <Repeat className="h-4 w-4" />, tone: "habit", onSelect: onHabit },
    { key: "task", label: "Новая задача", icon: <ListTodo className="h-4 w-4" />, tone: "task", onSelect: onTask },
    { key: "coach", label: "Коуч Nova", icon: <Sparkles className="h-4 w-4" />, tone: "ai", onSelect: onCoach },
  ];

  return (
    <div>
      <p className="mb-2.5 text-section text-muted-foreground">Быстрые действия</p>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => (
          <motion.button
            key={action.key}
            type="button"
            onClick={action.onSelect}
            whileTap={{ scale: 0.97 }}
            className="group flex items-center gap-2.5 rounded-xl border border-border surface-raised px-3 py-3 text-left shadow-card transition-colors duration-200 active:border-border-strong"
          >
            <IconChip tone={action.tone} size="md">
              {action.icon}
            </IconChip>
            <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium tracking-[-0.012em] text-foreground">
              {action.label}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-subtle-foreground transition-transform duration-200 group-active:translate-x-0.5" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
