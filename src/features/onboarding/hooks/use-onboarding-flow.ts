"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { completeOnboarding } from "@/features/onboarding/server/complete-onboarding.action";
import {
  onboardingProfileSchema,
  type OnboardingProfileInput,
} from "@/features/onboarding/schemas";
import { sessionQueryKey } from "@/features/auth/hooks/use-telegram-session";
import type { ResolvedSession } from "@/features/auth/server/resolve-session.action";

export const ONBOARDING_STEP_IDS = [
  "name",
  "goal",
  "theme",
  "age",
  "height",
  "weight",
  "gender",
  "occupation",
  "timezone",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

function buildDefaultValues(
  session: ResolvedSession,
): Partial<OnboardingProfileInput> {
  const fallbackName = [session.user.firstName, session.user.lastName]
    .filter(Boolean)
    .join(" ");

  return {
    name: session.profile?.name ?? fallbackName,
    age: session.profile?.age,
    heightCm: session.profile?.heightCm,
    weightKg: session.profile?.weightKg,
    gender: session.profile?.gender as OnboardingProfileInput["gender"] | undefined,
    primaryGoal: session.profile?.primaryGoal as
      | OnboardingProfileInput["primaryGoal"]
      | undefined,
    occupation: session.profile?.occupation as
      | OnboardingProfileInput["occupation"]
      | undefined,
    timezone:
      session.profile?.timezone ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Left undefined on a fresh run so the theme step waits for an explicit
    // choice instead of auto-advancing on its default (same pattern as the
    // gender/goal/occupation selection steps).
    themeColor: session.profile?.themeColor as
      | OnboardingProfileInput["themeColor"]
      | undefined,
  };
}

export function useOnboardingFlow(session: ResolvedSession) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawInitData = useRawInitData();

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Partial<OnboardingProfileInput>>(() =>
    buildDefaultValues(session),
  );

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: (_result, variables) => {
      queryClient.setQueryData(sessionQueryKey(rawInitData), {
        ...session,
        onboardingCompleted: true,
        profile: variables.profile,
      });
      router.replace("/");
    },
  });

  const stepId = ONBOARDING_STEP_IDS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEP_IDS.length - 1;

  function next(patch: Partial<OnboardingProfileInput>) {
    const updated = { ...values, ...patch };
    setValues(updated);

    if (!isLastStep) {
      setStepIndex((index) => index + 1);
      return;
    }

    if (!rawInitData) return;
    const profile = onboardingProfileSchema.parse(updated);
    mutation.mutate({ rawInitData, profile });
  }

  function back() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  return {
    stepId,
    stepIndex,
    totalSteps: ONBOARDING_STEP_IDS.length,
    values,
    next,
    back,
    isSubmitting: mutation.isPending,
    submitError: mutation.isError ? "Не удалось сохранить. Попробуйте ещё раз." : null,
  };
}
