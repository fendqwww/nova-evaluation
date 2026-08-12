"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { SegmentedChoice } from "@/features/onboarding/components/segmented-choice";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import {
  ACTIVITY_OPTIONS,
  AIM_LABELS,
  NUTRITION_AIMS,
  type ActivityLevel,
  type NutritionAim,
} from "@/features/nutrition/lib/targets";
import type { OnboardingProfileInput } from "@/features/onboarding/schemas";

const AIM_OPTIONS = NUTRITION_AIMS.map((value) => ({
  value,
  label: AIM_LABELS[value].replace(" вес", "").replace(" массу", ""),
}));

/**
 * How much you move, and what you want the scale to do.
 *
 * This scene exists because the app was asking for height, weight, age and sex
 * and then computing nothing from them — the calorie goal was a number the user
 * had to type in themselves. Mifflin–St Jeor turns those four into a resting
 * burn; the activity factor asked for here is what turns a resting burn into a
 * daily target, and without it there is no target to compute.
 *
 * The options are described by what the week looks like rather than by a word
 * like "умеренная", which two people will read three different ways. Counting
 * training sessions is something a person can actually do about themselves.
 */
export function ActivityStep({
  defaults,
  onNext,
  onBack,
  isSubmitting,
}: {
  defaults: { activityLevel?: ActivityLevel; aim?: NutritionAim };
  onNext: (patch: Partial<OnboardingProfileInput>) => void;
  onBack?: () => void;
  /** This is the final scene, so its CTA is what actually saves the profile. */
  isSubmitting?: boolean;
}) {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>(
    defaults.activityLevel,
  );
  const [aim, setAim] = useState<NutritionAim>(defaults.aim ?? "maintain");

  return (
    <StepShell
      title="Как проходит твоя неделя"
      subtitle="По этому Nova посчитает, сколько тебе нужно калорий и белка. Изменить можно в любой момент."
      onBack={onBack}
      scrollable
      footer={
        <Button
          className="w-full"
          size="lg"
          disabled={!activityLevel || isSubmitting}
          onClick={() => activityLevel && onNext({ activityLevel, aim })}
        >
          {isSubmitting ? "Считаем твой план…" : "Посчитать мой план"}
        </Button>
      }
    >
      <div className="flex flex-col gap-7">
        <div role="radiogroup" aria-label="Уровень активности" className="flex flex-col gap-2">
          {ACTIVITY_OPTIONS.map((option) => {
            const selected = option.value === activityLevel;

            return (
              <motion.button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                whileTap={{ scale: 0.985 }}
                onClick={() => setActivityLevel(option.value)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3.5 text-left transition-colors duration-200",
                  selected
                    ? "border-accent-border bg-accent-soft"
                    : "border-border active:border-border-strong",
                )}
              >
                <span
                  className={cn(
                    "text-body font-semibold tracking-[-0.012em]",
                    selected ? "text-accent" : "text-foreground",
                  )}
                >
                  {option.label}
                </span>
                <span className="text-caption text-muted-foreground">{option.hint}</span>
              </motion.button>
            );
          })}
        </div>

        <SegmentedChoice
          label="Что делаем с весом"
          options={AIM_OPTIONS}
          value={aim}
          onChange={setAim}
        />
      </div>
    </StepShell>
  );
}
