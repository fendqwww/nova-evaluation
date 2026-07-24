"use client";

import { useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { onboardingProfileSchema } from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

export function NameStep({ defaultValue, onNext, onBack }: OnboardingStepProps<string>) {
  const [value, setValue] = useState(defaultValue);
  const isValid = onboardingProfileSchema.shape.name.safeParse(value).success;

  return (
    <StepShell
      eyebrow="👋 Добро пожаловать в Nova"
      title="Как к вам обращаться?"
      onBack={onBack}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={!isValid}
          onClick={() => onNext({ name: value.trim() })}
        >
          Продолжить
        </Button>
      }
    >
      <Input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ваше имя"
        className="h-14 text-lg"
      />
    </StepShell>
  );
}
