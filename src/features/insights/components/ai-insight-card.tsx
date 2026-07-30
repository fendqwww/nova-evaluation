"use client";

import { Sparkles, ChevronRight } from "lucide-react";
import { Card, CardContent, IconChip } from "@/shared/ui/card";
import type { Insight } from "@/features/insights/types";

export function AiInsightCard({
  insight,
  onOpenCoach,
}: {
  insight: Insight;
  onOpenCoach: () => void;
}) {
  return (
    <button type="button" onClick={onOpenCoach} className="block w-full text-left">
      <Card className="active:border-border-strong">
        <CardContent className="flex items-start gap-3 p-4">
          <IconChip tone="ai" size="md">
            <Sparkles className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <p className="text-label uppercase text-muted-foreground">Совет от Nova</p>
            <p className="mt-1 text-title text-foreground">{insight.title}</p>
            <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">{insight.body}</p>
          </div>

          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-subtle-foreground" />
        </CardContent>
      </Card>
    </button>
  );
}
