"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import type { Insight } from "@/features/insights/types";

export function AiInsightCard({
  insight,
  onOpenCoach,
}: {
  insight: Insight;
  onOpenCoach: () => void;
}) {
  return (
    <Card className="relative overflow-hidden">
      {/* Soft accent glow — signals this is the "special" AI surface. */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        aria-hidden
      />
      <CardContent className="relative flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-muted-foreground">Совет от Nova</p>
        </div>
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">{insight.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>
        </div>
        <button
          type="button"
          onClick={onOpenCoach}
          className="group inline-flex items-center gap-1.5 self-start rounded-full border border-accent-border bg-accent-muted px-4 py-2 text-sm font-medium text-accent transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
        >
          Открыть Коуч Nova
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </CardContent>
    </Card>
  );
}
