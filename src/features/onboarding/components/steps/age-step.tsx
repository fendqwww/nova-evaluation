"use client";

import { useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { NumberField } from "@/features/onboarding/components/number-field";
import { Button } from "@/shared/ui/button";
import type { OnboardingStepProps } from "@/features/onboarding/types";

export function AgeStep({ defaultValue, onNext, onBack }: OnboardingStepProps<number>) {
  const [value, setValue] = useState(defaultValue);

  return (
    <StepShell
      title="Сколько вам лет?"
      onBack={onBack}
      footer={
        <Button className="w-full" size="lg" onClick={() => onNext({ age: value })}>
          Продолжить
        </Button>
      }
    >
      <NumberField value={value} onChange={setValue} unit="лет" min={10} max={120} />
    </StepShell>
  );
}
