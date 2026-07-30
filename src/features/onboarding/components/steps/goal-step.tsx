"use client";

import { StepShell } from "@/features/onboarding/components/step-shell";
import { OptionCard } from "@/features/onboarding/components/option-card";
import { useAdvanceOnSelect } from "@/features/onboarding/hooks/use-advance-on-select";
import {
  PRIMARY_GOAL_OPTIONS,
  type PrimaryGoalValue,
} from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

export function GoalStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<PrimaryGoalValue | undefined>) {
  const { selected, select } = useAdvanceOnSelect(defaultValue, (primaryGoal) =>
    onNext({ primaryGoal }),
  );

  return (
    <StepShell title="Какая твоя главная цель?" onBack={onBack}>
      <div className="flex flex-col gap-2.5">
        {PRIMARY_GOAL_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={selected === option.value}
            onSelect={() => select(option.value)}
          />
        ))}
      </div>
    </StepShell>
  );
}
