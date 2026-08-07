"use client";

import { Sparkle } from "lucide-react";
import { BrandMoment } from "@/features/onboarding/components/brand-moment";
import { Button } from "@/shared/ui/button";

/**
 * Первый экран приложения.
 *
 * «Добро пожаловать» здесь не написано намеренно: это фраза, которую печатает
 * любой продукт, и она ничего не обещает. Первый экран называет приложение и
 * говорит, что оно делает — связывает разделы между собой, а не просто хранит
 * их рядом.
 */
export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <BrandMoment
      icon={<Sparkle className="h-7 w-7" fill="currentColor" />}
      title="Это Nova"
      subtitle="Цели, привычки, тренировки, сон и питание — в одной системе, которая замечает связи между ними."
      footer={
        <Button className="w-full" size="lg" onClick={onStart}>
          Начать
        </Button>
      }
    />
  );
}
