"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { bulletDotClass } from "@/features/coach/lib/tone";
import type { DashboardData } from "@/features/dashboard/server/get-dashboard-data.action";

/**
 * The Coach, previewed on the Dashboard.
 *
 * It shows the *actual* first lines of today's analysis plus its most severe
 * finding, not a teaser written separately — so the card can never promise
 * something the Coach screen then fails to say.
 *
 * The ask button is full-width and inside the card rather than being a quarter
 * of a 2×2 grid of "quick actions" elsewhere on the screen. The Coach is the
 * one thing here that reads every other number on the page; sizing it like a
 * shortcut to a settings panel was the clearest signal that this app did not
 * know what its own centre was.
 */
export function CoachPreviewCard({ coach }: { coach: DashboardData["coach"] }) {
  return (
    <Card elevation="accent">
      <div className="flex flex-col gap-3.5 p-4">
        <Link href="/coach" className="flex items-start gap-3">
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
            <p className="mt-1 line-clamp-3 text-caption text-muted-foreground">{coach.body}</p>
          </div>
        </Link>

        {coach.highlight && (
          <div className="flex items-start gap-2 border-t border-border pt-3">
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

        {/* The real Button rather than a Link dressed up as one: the primary
            variant already owns the fill, the coloured drop shadow and the top
            sheen, and hand-copying them here is how a second button language
            starts. */}
        <Button asChild size="lg" className="group w-full font-semibold">
          <Link href="/coach?ask=1">
            Спросить AI Coach
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-active:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
