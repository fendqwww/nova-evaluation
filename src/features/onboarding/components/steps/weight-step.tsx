"use client";

import { useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { NumberField } from "@/features/onboarding/components/number-field";
import { Button } from "@/shared/ui/button";
import type { OnboardingStepProps } from "@/features/onboarding/types";

export function WeightStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<number>) {
  const [value, setValue] = useState(defaultValue);

  return (
    <StepShell
      title="Какой у вас вес?"
      onBack={onBack}
      footer={
        <Button
          className="w-full"
          size="lg"
          onClick={() => onNext({ weightKg: value })}
        >
          Продолжить
        </Button>
      }
    >
      <NumberField value={value} onChange={setValue} unit="кг" min={20} max={300} />
    </StepShell>
  );
}
