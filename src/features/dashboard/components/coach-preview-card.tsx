"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { bulletDotClass } from "@/features/coach/lib/tone";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

/**
 * The Coach, previewed on the Dashboard.
 *
 * It shows the *actual* first two lines of today's analysis plus its most
 * severe finding, not a teaser written separately — so the card can never
 * promise something the Coach screen then fails to say. It is a Link rather
 * than a modal trigger for the same reason: the Coach is a section of the app
 * now, and a section deserves a URL.
 */
export function CoachPreviewCard({ coach }: { coach: DashboardData["coach"] }) {
  return (
    <Link href="/coach" className="block">
      <Card elevation="accent" interactive className="active:border-accent">
        <CardContent className="flex items-start gap-3 p-4 pt-4">
          <IconChip tone="ai" size="md">
            <Sparkles className="h-4 w-4" />
          </IconChip>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label uppercase text-muted-foreground">Коуч Nova</p>
              {coach.potential > 0 && (
                <span className="numeric shrink-0 rounded-md bg-accent-muted px-1.5 py-0.5 text-[0.6875rem] font-semibold text-accent">
                  +{coach.potential} сегодня
                </span>
              )}
            </div>

            <p className="mt-1.5 text-title text-foreground">{coach.headline}</p>
            <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">{coach.body}</p>

            {coach.highlight && (
              <div className="mt-2.5 flex items-start gap-2 border-t border-border pt-2.5">
                <span
                  aria-hidden
                  className={cn(
                    "mt-[0.375rem] h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full",
                    bulletDotClass(coach.highlight.tone),
                  )}
                />
                <span className="text-caption text-foreground">{coach.highlight.text}</span>
              </div>
            )}
          </div>

          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-subtle-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
