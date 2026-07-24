"use client";

import { useEffect, useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { OptionCard } from "@/features/onboarding/components/option-card";
import {
  OCCUPATION_OPTIONS,
  type OccupationValue,
} from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

const ADVANCE_DELAY_MS = 220;

export function OccupationStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<OccupationValue | undefined>) {
  const [selected, setSelected] = useState(defaultValue);

  useEffect(() => {
    if (!selected) return;
    const timeout = window.setTimeout(
      () => onNext({ occupation: selected }),
      ADVANCE_DELAY_MS,
    );
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNext identity shouldn't restart the timer
  }, [selected]);

  return (
    <StepShell title="Чем вы занимаетесь?" onBack={onBack}>
      <div className="flex flex-col gap-3">
        {OCCUPATION_OPTIONS.map((option) => (
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
