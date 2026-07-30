"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Card, CardContent, IconChip } from "@/shared/ui/card";

export function ActivityOverviewCard({
  icon,
  title,
  count,
  unitLabel,
  tone,
  onCreate,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  unitLabel: (count: number) => string;
  tone: "goal" | "habit" | "task";
  onCreate: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onCreate}
      whileTap={{ scale: 0.97 }}
      aria-label={`${title}: ${count}. Добавить`}
      className="w-full text-left"
    >
      <Card className="h-full transition-colors duration-200 active:border-border-strong">
        <CardContent className="flex h-full flex-col gap-2.5 p-3">
          <div className="flex items-center justify-between gap-1">
            <IconChip tone={tone} size="sm">
              {icon}
            </IconChip>
            <Plus className="h-3.5 w-3.5 text-subtle-foreground" />
          </div>
          <div>
            <p className="numeric text-[1.75rem] font-semibold leading-none text-foreground">
              {count}
            </p>
            {/* The chip colour already names the category, so the label
                carries the declined noun alone — "2 цели", not "Цели · цели". */}
            <p className="mt-1 text-[0.75rem] leading-tight text-muted-foreground">
              {unitLabel(count)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}
