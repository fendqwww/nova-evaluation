"use client";

import { Plus, Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import type { AiProfileFacts } from "@/features/profile/types";

function bmiTone(bmi: number): string {
  // The healthy band, the same one the wellness block scores against.
  if (bmi >= 18.5 && bmi < 25) return "text-positive";
  if (bmi >= 25 && bmi < 30) return "text-warning";
  return "text-destructive";
}

/**
 * The body, on the profile screen.
 *
 * Профиль showed a score, a streak, a lifetime tally, an activity chart and a
 * trophy shelf — everything except the thing a fitness app is about. Height,
 * weight and BMI were already computed and already handed to the Coach; they
 * simply had nowhere on this screen to appear.
 *
 * The weight delta is shown only when there is a real earlier reading to
 * compare against. A "−0 кг" on day one is not a neutral fact, it is the screen
 * admitting it has nothing to say, and it should stay quiet instead.
 */
export function BodyCard({
  ai,
  startWeightKg,
  onLogWeight,
}: {
  ai: AiProfileFacts;
  /** The earliest weight on record, or null when there is only one reading. */
  startWeightKg: number | null;
  /** Открывает форму записи веса. */
  onLogWeight: () => void;
}) {
  const delta =
    startWeightKg === null ? null : Math.round((ai.weightKg - startWeightKg) * 10) / 10;
  const DeltaIcon = delta === null || delta === 0 ? Minus : delta < 0 ? TrendingDown : TrendingUp;

  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-center gap-2">
          <IconChip tone="score" size="sm">
            <Scale className="h-3.5 w-3.5" />
          </IconChip>
          <p className="text-label uppercase text-muted-foreground">Тело</p>

          {/* Запись веса живёт здесь, а не в настройках: это единственное число
              на экране, которое человек меняет сам и регулярно. */}
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto"
            onClick={() => {
              haptics.tap();
              onLogWeight();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Вес
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="numeric text-[1.5rem] font-bold leading-none tracking-[-0.035em] text-foreground">
              {ai.weightKg}
            </span>
            <span className="text-[0.6875rem] text-subtle-foreground">Вес, кг</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "numeric text-[1.5rem] font-bold leading-none tracking-[-0.035em]",
                bmiTone(ai.bmi),
              )}
            >
              {ai.bmi.toFixed(1).replace(".", ",")}
            </span>
            <span className="text-[0.6875rem] text-subtle-foreground">ИМТ · {ai.bmiLabel}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                "numeric flex items-center gap-1 text-[1.5rem] font-bold leading-none tracking-[-0.035em]",
                delta === null || delta === 0
                  ? "text-muted-foreground"
                  : delta < 0
                    ? "text-positive"
                    : "text-foreground",
              )}
            >
              <DeltaIcon className="h-4 w-4 shrink-0" />
              {delta === null ? "—" : `${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")}`}
            </span>
            <span className="text-[0.6875rem] text-subtle-foreground">
              {delta === null ? "Нет истории" : "Изменение, кг"}
            </span>
          </div>
        </div>

        <p className="border-t border-border pt-3 text-caption text-muted-foreground">
          Рост {ai.heightCm} см · {ai.age} лет. Эти цифры Nova использует для нормы
          калорий и для оценки нагрузки.
        </p>
      </div>
    </Card>
  );
}
