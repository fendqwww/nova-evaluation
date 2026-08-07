"use client";

import { useState } from "react";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { RulerPicker } from "@/features/onboarding/components/ruler-picker";
import { SegmentedChoice } from "@/features/onboarding/components/segmented-choice";
import { Button } from "@/shared/ui/button";
import {
  GENDER_OPTIONS,
  type GenderValue,
  type OnboardingProfileInput,
} from "@/features/onboarding/schemas";

interface AboutStepProps {
  defaults: { age: number; heightCm: number; weightKg: number; gender?: GenderValue };
  onNext: (patch: Partial<OnboardingProfileInput>) => void;
  onBack?: () => void;
  /** This is the final scene, so its CTA is what actually saves the profile. */
  isSubmitting?: boolean;
}

/**
 * Age, height, weight and gender on one scene.
 *
 * These were four consecutive screens, which read as a medical intake form —
 * and asked for body measurements with no stated reason, which no premium
 * product does. Grouping them under one honest subtitle turns four
 * interrogations into a single legible task the user can see the end of.
 *
 * The CTA stays enabled: every ruler starts on a sane default and gender is the
 * only field that can be genuinely unset, so it's the only one that gates.
 */
export function AboutStep({ defaults, onNext, onBack, isSubmitting }: AboutStepProps) {
  const [age, setAge] = useState(defaults.age);
  const [heightCm, setHeightCm] = useState(defaults.heightCm);
  const [weightKg, setWeightKg] = useState(defaults.weightKg);
  const [gender, setGender] = useState<GenderValue | undefined>(defaults.gender);

  return (
    <StepShell
      title="Немного о тебе"
      subtitle="Нужно, чтобы Nova точно считала нагрузку, активность и восстановление."
      onBack={onBack}
      scrollable
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={!gender || isSubmitting}
          onClick={() => gender && onNext({ age, heightCm, weightKg, gender })}
        >
          {isSubmitting ? "Сохраняем…" : "Продолжить"}
        </Button>
      }
    >
      <div className="flex flex-col gap-7">
        <RulerPicker
          compact
          label="Возраст"
          value={age}
          onChange={setAge}
          unit="лет"
          min={10}
          max={120}
        />
        <RulerPicker
          compact
          label="Рост"
          value={heightCm}
          onChange={setHeightCm}
          unit="см"
          min={80}
          max={250}
        />
        <RulerPicker
          compact
          label="Вес"
          value={weightKg}
          onChange={setWeightKg}
          unit="кг"
          min={20}
          max={300}
        />
        <SegmentedChoice
          label="Пол"
          options={GENDER_OPTIONS}
          value={gender}
          onChange={setGender}
        />
      </div>
    </StepShell>
  );
}
