"use client";

import { StepShell } from "@/features/onboarding/components/step-shell";
import { OptionCard } from "@/features/onboarding/components/option-card";
import { useAdvanceOnSelect } from "@/features/onboarding/hooks/use-advance-on-select";
import {
  OCCUPATION_OPTIONS,
  type OccupationValue,
} from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

export function OccupationStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<OccupationValue | undefined>) {
  const { selected, select } = useAdvanceOnSelect(defaultValue, (occupation) =>
    onNext({ occupation }),
  );

  return (
    <StepShell title="Чем ты занимаешься?" onBack={onBack}>
      <div className="flex flex-col gap-2.5">
        {OCCUPATION_OPTIONS.map((option) => (
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
