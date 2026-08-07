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

/**
 * The scene order — a conversation, not a field list.
 *
 * Two of these six scenes ("greeting", "focus") collect nothing: they are
 * Nova answering what the user just said. They are part of the sequence rather
 * than decoration between steps, because the turn-taking *is* the flow.
 *
 * Not here on purpose:
 *  - timezone — auto-detected in buildDefaultValues, the way Notion and
 *    Revolut handle it. Asking a question nobody wants to answer is the
 *    opposite of a premium flow.
 *  - themeColor — pure personalisation, so it lives in Профиль → Внешний вид.
 *    It used to be the last scene, which made a settings panel the emotional
 *    peak of onboarding; the recap now closes the flow instead.
 *
 * age/height/weight/gender were four consecutive scenes and are now one
 * ("about"), which is what stopped that stretch reading as a medical intake.
 */
export const ONBOARDING_SCENE_IDS = [
  "name",
  "greeting",
  "occupation",
  "goal",
  "focus",
  "about",
] as const;

export type OnboardingSceneId = (typeof ONBOARDING_SCENE_IDS)[number];

/**
 * The journey has three phases, not just a scene index: a brand welcome
 * moment, the conversation itself, and the closing recap. "done" is reached
 * the instant the save succeeds, but the session cache isn't updated yet —
 * that only happens when the user taps through the recap, so
 * SessionBoundary's redirect can't fire mid-celebration.
 */
export type OnboardingPhase = "welcome" | "scenes" | "done";

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
    themeColor: session.profile?.themeColor as
      | OnboardingProfileInput["themeColor"]
      | undefined,
  };
}

export function useOnboardingFlow(session: ResolvedSession) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rawInitData = useRawInitData();

  const [phase, setPhase] = useState<OnboardingPhase>("welcome");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [values, setValues] = useState<Partial<OnboardingProfileInput>>(() =>
    buildDefaultValues(session),
  );

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => setPhase("done"),
  });

  const sceneId = ONBOARDING_SCENE_IDS[sceneIndex];
  const isLastScene = sceneIndex === ONBOARDING_SCENE_IDS.length - 1;

  function start() {
    setPhase("scenes");
  }

  /** Nova's reply scenes pass no patch — they only move the conversation on. */
  function next(patch: Partial<OnboardingProfileInput> = {}) {
    const updated = { ...values, ...patch };
    setValues(updated);

    if (!isLastScene) {
      setSceneIndex((index) => index + 1);
      return;
    }

    const profile = onboardingProfileSchema.parse(updated);
    mutation.mutate({ rawInitData, profile });
  }

  function back() {
    setSceneIndex((index) => Math.max(0, index - 1));
  }

  // Both halves of leaving onboarding, deferred until the user has actually
  // tapped through the closing recap: the cache write tells the rest of the
  // app the profile is complete, and the navigation is what actually moves
  // us to the Dashboard.
  //
  // The navigation is explicit rather than left to SessionBoundary's
  // redirect. That guard's job is "a finished user doesn't belong on
  // /onboarding", and development needs to switch it off so the flow stays
  // reachable (see the redirectWhen in app/onboarding/page.tsx). Leaning on
  // it for the exit too would mean disabling the guard also traps the user on
  // the final screen. In production both paths point at "/", so this is
  // idempotent.
  function finish() {
    const profile = onboardingProfileSchema.parse(values);
    queryClient.setQueryData(sessionQueryKey(rawInitData), {
      ...session,
      onboardingCompleted: true,
      profile,
    });
    router.replace("/");
  }

  return {
    phase,
    start,
    sceneId,
    sceneIndex,
    values,
    next,
    back,
    finish,
    isSubmitting: mutation.isPending,
    submitError: mutation.isError ? "Не удалось сохранить. Попробуй ещё раз." : null,
  };
}
