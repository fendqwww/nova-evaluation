"use client";

import { useMemo, useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { Button } from "@/shared/ui/button";
import type { OnboardingStepProps } from "@/features/onboarding/types";

function getTimezoneOptions(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return [Intl.DateTimeFormat().resolvedOptions().timeZone];
}

interface TimezoneStepProps extends OnboardingStepProps<string> {
  isSubmitting?: boolean;
}

export function TimezoneStep({
  defaultValue,
  onNext,
  onBack,
  isSubmitting,
}: TimezoneStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const timezones = useMemo(() => getTimezoneOptions(), []);

  return (
    <StepShell
      title="Проверьте часовой пояс"
      subtitle="Это поможет Nova показывать напоминания вовремя."
      onBack={onBack}
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={isSubmitting}
          onClick={() => onNext({ timezone: value })}
        >
          {isSubmitting ? "Сохраняем..." : "Продолжить"}
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <p className="text-center text-2xl font-semibold text-foreground">
          {value}
        </p>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm font-medium text-accent"
          >
            Изменить
          </button>
        ) : (
          <select
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-lg border border-border bg-input px-3.5 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {timezones.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        )}
      </div>
    </StepShell>
  );
}
