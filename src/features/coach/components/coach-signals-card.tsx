"use client";

import { CheckCircle2, Flame, ListChecks, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { bulletDotClass } from "@/features/coach/lib/tone";
import type { CoachBullet, CoachSignals } from "@/features/coach/types";

/**
 * Recommendations, warnings and motivation — the three lists that stand
 * regardless of what the brief happens to be arguing today.
 *
 * "Предупреждений нет" is rendered, not omitted. A section that silently
 * disappears when everything is fine leaves the user unable to tell "nothing is
 * wrong" from "the coach didn't check".
 */
export function CoachSignalsCard({ signals }: { signals: CoachSignals }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 pt-4">
        <Section
          icon={<ListChecks className="h-3.5 w-3.5" />}
          title="Рекомендации"
          items={signals.recommendations}
          emptyText="Пока нечего рекомендовать — данных мало."
        />

        <div className="border-t border-border pt-4">
          <Section
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            title="Предупреждения"
            items={signals.warnings}
            emptyText="Предупреждений нет — ничего не горит."
            emptyIcon={<CheckCircle2 className="h-3.5 w-3.5 text-positive" />}
          />
        </div>

        <div className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.625rem] bg-tint-orange-muted text-tint-orange ring-1 ring-inset ring-white/[0.06]">
            <Flame className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-label uppercase text-muted-foreground">Мотивация</p>
            <p className="mt-1 text-caption text-foreground">{signals.motivation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  icon,
  title,
  items,
  emptyText,
  emptyIcon,
}: {
  icon: React.ReactNode;
  title: string;
  items: CoachBullet[];
  emptyText: string;
  emptyIcon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-section font-semibold text-muted-foreground">
        {icon}
        {title}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          {emptyIcon}
          {emptyText}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  "mt-[0.4375rem] h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full",
                  bulletDotClass(item.tone),
                )}
              />
              <span className="text-caption text-foreground">{item.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
