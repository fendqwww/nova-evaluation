"use client";

import { StatementScene } from "@/features/onboarding/components/statement-scene";
import { Button } from "@/shared/ui/button";

/**
 * Nova's reply to the name — the first moment the flow gives something back
 * instead of only taking. The name is echoed in the accent colour, which is
 * the one place in the app coloured text is allowed.
 */
export function GreetingStep({
  name,
  onNext,
  onBack,
}: {
  name: string;
  onNext: () => void;
  onBack?: () => void;
}) {
  return (
    <StatementScene
      title={
        <>
          Приятно познакомиться,{" "}
          <span className="text-accent">{name}</span>
        </>
      }
      body="Задам ещё пару вопросов, чтобы понимать твой контекст — и дальше буду работать на тебя."
      onBack={onBack}
      footer={
        <Button className="w-full" size="lg" onClick={onNext}>
          Дальше
        </Button>
      }
    />
  );
}
