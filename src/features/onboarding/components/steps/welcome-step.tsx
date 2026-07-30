"use client";

import { Sparkle } from "lucide-react";
import { BrandMoment } from "@/features/onboarding/components/brand-moment";
import { Button } from "@/shared/ui/button";

export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <BrandMoment
      icon={<Sparkle className="h-7 w-7" fill="currentColor" />}
      title="Добро пожаловать в Nova"
      subtitle="Твоя система для целей, привычек и ежедневного фокуса — в одном месте."
      footer={
        <Button className="w-full" size="lg" onClick={onStart}>
          Начать
        </Button>
      }
    />
  );
}
