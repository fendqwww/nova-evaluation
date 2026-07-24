"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";

export function ActivityOverviewCard({
  icon,
  title,
  count,
  unitLabel,
  badgeClass,
  textClass,
  onCreate,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  unitLabel: (count: number) => string;
  badgeClass: string;
  textClass: string;
  onCreate: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onCreate}
      whileTap={{ scale: 0.97 }}
      className="w-full text-left"
    >
      <Card className="h-full transition-colors duration-200 hover:border-border-strong hover:bg-surface-2">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full ${badgeClass} ${textClass}`}
            >
              {icon}
            </span>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">
              {title} · {unitLabel(count)}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}
