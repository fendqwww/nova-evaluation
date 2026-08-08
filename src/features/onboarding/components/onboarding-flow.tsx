"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useOnboardingFlow } from "@/features/onboarding/hooks/use-onboarding-flow";
import { WelcomeStep } from "@/features/onboarding/components/steps/welcome-step";
import { ReadyStep } from "@/features/onboarding/components/steps/ready-step";
import { ConsentStep } from "@/features/onboarding/components/steps/consent-step";
import { NameStep } from "@/features/onboarding/components/steps/name-step";
import { GreetingStep } from "@/features/onboarding/components/steps/greeting-step";
import { OccupationStep } from "@/features/onboarding/components/steps/occupation-step";
import { GoalStep } from "@/features/onboarding/components/steps/goal-step";
import { FocusStep } from "@/features/onboarding/components/steps/focus-step";
import { AboutStep } from "@/features/onboarding/components/steps/about-step";
import type { ResolvedSession } from "@/features/auth/server/resolve-session.action";

const sceneVariants = {
  enter: { opacity: 0, x: 18 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
};

const sceneTransition = { type: "spring" as const, stiffness: 380, damping: 38, mass: 0.9 };

export function OnboardingFlow({ session }: { session: ResolvedSession }) {
  const {
    phase,
    start,
    sceneId,
    sceneIndex,
    values,
    next,
    back,
    finish,
    isSubmitting,
    submitError,
  } = useOnboardingFlow(session);

  if (phase === "welcome") {
    return <WelcomeStep onStart={start} />;
  }

  if (phase === "done") {
    return <ReadyStep values={values} onFinish={finish} />;
  }

  const onBack = sceneIndex > 0 ? back : undefined;

  return (
    <div className="mx-auto flex h-full w-full max-w-lg flex-col px-6 pb-[max(1.5rem,var(--app-safe-bottom))] pt-[max(1.25rem,var(--app-safe-top))]">
      {/* min-h-0 on both this row and the animated child: without it the
          flex chain silently stops handing height down, and StepShell's
          h-full collapses to its content instead of filling the screen. */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sceneId}
            variants={sceneVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={sceneTransition}
            className="flex min-h-0 flex-1 flex-col"
          >
            {/* Без onBack: назад с первой сцены некуда, а «пропустить»
                согласие нельзя по смыслу. */}
            {sceneId === "consent" && <ConsentStep onNext={() => next()} />}
            {sceneId === "name" && (
              <NameStep defaultValue={values.name ?? ""} onNext={next} onBack={onBack} />
            )}
            {/* Nova's replies read from what the preceding scene just stored,
                so the copy is always about this user's own answer. */}
            {sceneId === "greeting" && (
              <GreetingStep
                name={values.name ?? ""}
                onNext={() => next()}
                onBack={onBack}
              />
            )}
            {sceneId === "occupation" && (
              <OccupationStep
                defaultValue={values.occupation}
                onNext={next}
                onBack={onBack}
              />
            )}
            {sceneId === "goal" && (
              <GoalStep defaultValue={values.primaryGoal} onNext={next} onBack={onBack} />
            )}
            {sceneId === "focus" && values.primaryGoal && (
              <FocusStep
                goal={values.primaryGoal}
                onNext={() => next()}
                onBack={onBack}
              />
            )}
            {sceneId === "about" && (
              <AboutStep
                defaults={{
                  age: values.age ?? 25,
                  heightCm: values.heightCm ?? 170,
                  weightKg: values.weightKg ?? 70,
                  gender: values.gender,
                }}
                onNext={next}
                onBack={onBack}
                isSubmitting={isSubmitting}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {submitError && (
        <p className="pt-4 text-center text-caption text-destructive">{submitError}</p>
      )}
    </div>
  );
}
