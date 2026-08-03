"use client";

import { Scale } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import type { ReportsSnapshot } from "@/features/reports/types";

/**
 * Current weight and BMI, read straight from Profile — the same figures the
 * Life Score's wellness block and the Coach's "AI Profile" card use.
 *
 * No trend line here: there is no weight log in this app, only the single
 * value entered at onboarding, so a chart would either be flat and dishonest
 * or fabricated. A dedicated weight-tracking feature is a bigger addition
 * than a report card should quietly assume — this shows the one number that
 * genuinely exists.
 */
export function ReportsWeightCard({ profile }: { profile: ReportsSnapshot["profile"] }) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <IconChip tone="score" size="md">
          <Scale className="h-4 w-4" />
        </IconChip>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body font-medium text-foreground">Вес</p>
          <p className="text-caption text-muted-foreground">
            Рост {profile.heightCm} см · ИМТ {profile.bmi || "—"} ({profile.bmiLabel})
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-1">
          <span className="numeric text-title text-foreground">{profile.weightKg}</span>
          <span className="text-caption text-subtle-foreground">кг</span>
        </div>
      </div>
    </Card>
  );
}
