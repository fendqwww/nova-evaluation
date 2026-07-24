"use client";

import { useEffect, useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { OptionCard } from "@/features/onboarding/components/option-card";
import {
  PRIMARY_GOAL_OPTIONS,
  type PrimaryGoalValue,
} from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

const ADVANCE_DELAY_MS = 220;

export function GoalStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<PrimaryGoalValue | undefined>) {
  const [selected, setSelected] = useState(defaultValue);

  useEffect(() => {
    if (!selected) return;
    const timeout = window.setTimeout(
      () => onNext({ primaryGoal: selected }),
      ADVANCE_DELAY_MS,
    );
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNext identity shouldn't restart the timer
  }, [selected]);

  return (
    <StepShell title="Какая ваша главная цель?" onBack={onBack}>
      <div className="flex flex-col gap-3">
        {PRIMARY_GOAL_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={selected === option.value}
            onSelect={() => setSelected(option.value)}
          />
        ))}
      </div>
    </StepShell>
  );
}
