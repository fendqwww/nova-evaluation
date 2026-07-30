"use client";

import { ArrowRight, CalendarClock, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { formatDay } from "@/shared/lib/calendar-day";
import { deltaBadgeClass, deltaClass, formatDelta } from "@/features/coach/lib/tone";
import type { CoachDailyReport } from "@/features/coach/types";

/**
 * Yesterday against today.
 *
 * Recomputed on every load rather than snapshotted nightly, which is why it is
 * still correct for someone who did not open the app yesterday — see
 * buildDailyReport. The "первый день" state is a real state, not an empty
 * table: a column of zeros would read as a collapse rather than as an absence.
 */
export function CoachReportCard({ report }: { report: CoachDailyReport }) {
  if (!report.hasYesterday) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-4 pt-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-white/[0.06] text-muted-foreground ring-1 ring-inset ring-white/[0.06]">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-body font-medium text-foreground">Это твой первый день</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Завтра здесь появится сравнение: что выросло, что просело и почему.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3.5 p-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label uppercase text-muted-foreground">Вчера и сегодня</p>
          <p className="text-[0.6875rem] text-subtle-foreground">
            {formatDay(report.yesterdayDay, report.today)} → сегодня
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {report.rows.map((row) => {
            const suffix = row.format === "percent" ? "%" : "";
            return (
              <li key={row.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
                  {row.label}
                </span>

                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="numeric text-caption text-subtle-foreground">
                    {row.yesterday}
                    {suffix}
                  </span>
                  <ArrowRight className="h-3 w-3 text-subtle-foreground" />
                  <span
                    className={cn(
                      "numeric text-caption font-semibold",
                      row.delta === 0 ? "text-foreground" : deltaClass(row.delta, row.higherIsBetter),
                    )}
                  >
                    {row.today}
                    {suffix}
                  </span>
                  <span
                    className={cn(
                      "numeric w-12 rounded-md px-1.5 py-0.5 text-center text-[0.6875rem] font-semibold",
                      deltaBadgeClass(row.delta, row.higherIsBetter),
                    )}
                  >
                    {formatDelta(row.delta, suffix)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        {(report.improved.length > 0 || report.worsened.length > 0) && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-3.5">
            {report.improved.length > 0 && (
              <ChangeList
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                title="Что улучшилось"
                items={report.improved}
                tone="positive"
              />
            )}
            {report.worsened.length > 0 && (
              <ChangeList
                icon={<TrendingDown className="h-3.5 w-3.5" />}
                title="Что стало хуже"
                items={report.worsened}
                tone="negative"
              />
            )}
          </div>
        )}

        {report.improved.length === 0 && report.worsened.length === 0 && (
          <p className="border-t border-border pt-3.5 text-caption text-muted-foreground">
            За сутки ничего не сдвинулось — ни в плюс, ни в минус.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ChangeList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "positive" | "negative";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "flex items-center gap-1.5 text-[0.75rem] font-semibold",
          tone === "positive" ? "text-positive" : "text-destructive",
        )}
      >
        {icon}
        {title}
      </div>
      <ul className="flex flex-col gap-1 pl-5">
        {items.map((item) => (
          <li key={item} className="text-caption text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
