"use client";

import { useEffect, useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { OptionCard } from "@/features/onboarding/components/option-card";
import { THEME_OPTIONS, type ThemeValue } from "@/features/onboarding/schemas";
import type { OnboardingStepProps } from "@/features/onboarding/types";

const ADVANCE_DELAY_MS = 220;

export function ThemeStep({
  defaultValue,
  onNext,
  onBack,
}: OnboardingStepProps<ThemeValue | undefined>) {
  const [selected, setSelected] = useState(defaultValue);

  useEffect(() => {
    if (!selected) return;
    // Instant preview — the real save happens through the normal
    // completeOnboarding flow a moment later.
    document.documentElement.dataset.theme = selected;
    const timeout = window.setTimeout(() => onNext({ themeColor: selected }), ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNext identity shouldn't restart the timer
  }, [selected]);

  return (
    <StepShell title="Какой стиль интерфейса вам нравится?" onBack={onBack}>
      <div className="flex flex-col gap-3">
        {THEME_OPTIONS.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={selected === option.value}
            swatchColor={option.swatch}
            onSelect={() => setSelected(option.value)}
          />
        ))}
      </div>
    </StepShell>
  );
}
