"use client";

import type { ReactNode } from "react";
import { Target, Repeat, ListTodo, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface QuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  badge: string;
  text: string;
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
    {
      key: "goal",
      label: "Новая цель",
      icon: <Target className="h-5 w-5" />,
      badge: "bg-tint-purple-muted",
      text: "text-tint-purple",
      onSelect: onGoal,
    },
    {
      key: "habit",
      label: "Новая привычка",
      icon: <Repeat className="h-5 w-5" />,
      badge: "bg-tint-orange-muted",
      text: "text-tint-orange",
      onSelect: onHabit,
    },
    {
      key: "task",
      label: "Новая задача",
      icon: <ListTodo className="h-5 w-5" />,
      badge: "bg-tint-blue-muted",
      text: "text-tint-blue",
      onSelect: onTask,
    },
    {
      key: "coach",
      label: "Коуч Nova",
      icon: <Sparkles className="h-5 w-5" />,
      badge: "bg-accent-muted",
      text: "text-accent",
      onSelect: onCoach,
    },
  ];

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">Быстрые действия</p>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <motion.button
            key={action.key}
            type="button"
            onClick={action.onSelect}
            whileTap={{ scale: 0.96 }}
            className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors duration-200 hover:border-border-strong hover:bg-surface-2"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full ${action.badge} ${action.text}`}
            >
              {action.icon}
            </span>
            <span className="text-sm font-semibold text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
