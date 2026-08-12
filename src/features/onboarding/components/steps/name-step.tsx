"use client";

import { useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { Button } from "@/shared/ui/button";
import { onboardingProfileSchema } from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

/**
 * Deliberately not the shared <Input>: a bordered, filled box is the single
 * most form-like element a screen can contain. Here the field is borderless
 * and set at scene scale, so the user is writing their name into the scene
 * rather than filling a widget — with one accent rule underneath as the only
 * chrome.
 */
export function NameStep({ defaultValue, onNext, onBack }: OnboardingStepProps<string>) {
  const [value, setValue] = useState(defaultValue);
  const isValid = onboardingProfileSchema.shape.name.safeParse(value).success;

  return (
    <StepShell
      title="Как тебя зовут?"
      subtitle="Так Nova будет обращаться к тебе каждый день."
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
      <div className="group flex flex-col gap-3">
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && isValid) onNext({ name: value.trim() });
          }}
          placeholder="Имя"
          aria-label="Твоё имя"
          enterKeyHint="next"
          className="w-full bg-transparent text-metric-lg font-bold tracking-[-0.03em] text-foreground caret-accent outline-none placeholder:font-semibold placeholder:text-subtle-foreground"
        />
        <span className="h-px w-full bg-border-strong transition-colors duration-200 group-focus-within:bg-accent" />
      </div>
    </StepShell>
  );
}
