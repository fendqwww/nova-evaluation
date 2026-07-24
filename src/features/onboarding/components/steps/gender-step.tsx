"use client";

import { useEffect, useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { OptionCard } from "@/features/onboarding/components/option-card";
import { GENDER_OPTIONS, type GenderValue } from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

// Selecting a card visibly confirms the choice, then advances on its own —
// one tap instead of tap-to-select-then-tap-Continue.
const ADVANCE_DELAY_MS = 220;

export function GenderStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<GenderValue | undefined>) {
  const [selected, setSelected] = useState(defaultValue);

  useEffect(() => {
    if (!selected) return;
    const timeout = window.setTimeout(() => onNext({ gender: selected }), ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNext identity shouldn't restart the timer
  }, [selected]);

  return (
    <StepShell title="Укажите ваш пол" onBack={onBack}>
      <div className="flex flex-col gap-3">
        {GENDER_OPTIONS.map((option) => (
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
