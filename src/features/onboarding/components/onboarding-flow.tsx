"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useOnboardingFlow } from "@/features/onboarding/hooks/use-onboarding-flow";
import { ProgressBar } from "@/features/onboarding/components/progress-bar";
import { NameStep } from "@/features/onboarding/components/steps/name-step";
import { AgeStep } from "@/features/onboarding/components/steps/age-step";
import { HeightStep } from "@/features/onboarding/components/steps/height-step";
import { WeightStep } from "@/features/onboarding/components/steps/weight-step";
import { GenderStep } from "@/features/onboarding/components/steps/gender-step";
import { GoalStep } from "@/features/onboarding/components/steps/goal-step";
import { OccupationStep } from "@/features/onboarding/components/steps/occupation-step";
import { TimezoneStep } from "@/features/onboarding/components/steps/timezone-step";
import type { ResolvedSession } from "@/features/auth/server/resolve-session.action";

const stepVariants = {
  enter: { opacity: 0, y: 12, scale: 0.98 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
};

export function OnboardingFlow({ session }: { session: ResolvedSession }) {
  const {
    stepId,
    stepIndex,
    totalSteps,
    values,
    next,
    back,
    isSubmitting,
    submitError,
  } = useOnboardingFlow(session);

  const onBack = stepIndex > 0 ? back : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-[max(1.5rem,var(--app-safe-bottom))] pt-[max(1.25rem,var(--app-safe-top))]">
      <ProgressBar current={stepIndex + 1} total={totalSteps} />

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepId}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="flex flex-1 flex-col"
          >
            {stepId === "name" && (
              <NameStep defaultValue={values.name ?? ""} onNext={next} onBack={onBack} />
            )}
            {stepId === "age" && (
              <AgeStep defaultValue={values.age ?? 25} onNext={next} onBack={onBack} />
            )}
            {stepId === "height" && (
              <HeightStep
                defaultValue={values.heightCm ?? 170}
                onNext={next}
                onBack={onBack}
              />
            )}
            {stepId === "weight" && (
              <WeightStep
                defaultValue={values.weightKg ?? 70}
                onNext={next}
                onBack={onBack}
              />
            )}
            {stepId === "gender" && (
              <GenderStep defaultValue={values.gender} onNext={next} onBack={onBack} />
            )}
            {stepId === "goal" && (
              <GoalStep
                defaultValue={values.primaryGoal}
                onNext={next}
                onBack={onBack}
              />
            )}
            {stepId === "occupation" && (
              <OccupationStep
                defaultValue={values.occupation}
                onNext={next}
                onBack={onBack}
              />
            )}
            {stepId === "timezone" && (
              <TimezoneStep
                defaultValue={
                  values.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
                }
                onNext={next}
                onBack={onBack}
                isSubmitting={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {submitError && (
        <p className="pb-4 text-center text-sm text-destructive">{submitError}</p>
      )}
    </div>
  );
}
