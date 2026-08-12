"use client";

import { StatementScene } from "@/features/onboarding/components/statement-scene";
import { Button } from "@/shared/ui/button";
import { calculateTargets, type ActivityLevel, type NutritionAim } from "@/features/nutrition/lib/targets";
import type { OnboardingProfileInput } from "@/features/onboarding/schemas";

/**
 * The closing scene: the plan Nova computed from what it just heard.
 *
 * This used to be a recap — Nova repeating the answers back. That was already
 * better than the theme picker it replaced, but it still ended the flow with
 * the user having given eight answers and received nothing: every line on the
 * screen was something they had typed thirty seconds earlier.
 *
 * Now the last thing they see is the thing they came for. Four numbers they did
 * not know, derived from four they did, with the arithmetic named out loud so
 * the figures read as computed rather than invented. That is the moment the
 * flow stops being an intake form and becomes an exchange.
 */
export function ReadyStep({
  values,
  onFinish,
}: {
  values: Partial<OnboardingProfileInput>;
  onFinish: () => void;
}) {
  const canCompute =
    values.age !== undefined &&
    values.heightCm !== undefined &&
    values.weightKg !== undefined &&
    values.gender !== undefined &&
    values.activityLevel !== undefined;

  const targets = canCompute
    ? calculateTargets({
        age: values.age!,
        heightCm: values.heightCm!,
        weightKg: values.weightKg!,
        gender: values.gender!,
        activity: values.activityLevel as ActivityLevel,
        aim: (values.aim ?? "maintain") as NutritionAim,
      })
    : null;

  return (
    <StatementScene
      title="Твой план готов"
      body={
        targets
          ? `Nova посчитала это из твоего роста, веса, возраста и активности. Дневник питания уже знает эти цифры.`
          : "Профиль готов. Дальше — первая цель или привычка, и Nova начнёт вести тебя по ней."
      }
      footer={
        <Button className="w-full" size="lg" onClick={onFinish}>
          Перейти в Nova
        </Button>
      }
    >
      {targets && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 rounded-2xl border border-accent-border bg-accent-soft px-4 py-4">
            <span className="text-label uppercase text-accent">Калорий в день</span>
            <span className="numeric text-metric-2xl text-foreground">{targets.calories}</span>
            <span className="text-caption text-muted-foreground">
              Поддержание — {targets.tdee} ккал, в покое тело тратит {targets.bmr}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <MacroTile label="Белки" value={targets.proteinG} />
            <MacroTile label="Жиры" value={targets.fatG} />
            <MacroTile label="Углеводы" value={targets.carbsG} />
          </div>

          <p className="text-caption text-subtle-foreground">
            {targets.wasFloored
              ? "Дефицит ограничен снизу — ниже этой калорийности без наблюдения врача снижаться не стоит. "
              : ""}
            Это расчётная оценка, а не предписание. Через пару недель Nova
            скорректирует её по твоему реальному весу.
          </p>
        </div>
      )}
    </StatementScene>
  );
}

function MacroTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border px-2 py-3">
      <span className="numeric text-page font-bold leading-none tracking-[-0.03em] text-foreground">
        {value}
      </span>
      <span className="text-micro text-subtle-foreground">{label}, г</span>
    </div>
  );
}
