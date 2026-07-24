import type { OnboardingProfileInput } from "@/features/onboarding/schemas";

export interface OnboardingStepProps<T> {
  defaultValue: T;
  onNext: (patch: Partial<OnboardingProfileInput>) => void;
  onBack?: () => void;
}
