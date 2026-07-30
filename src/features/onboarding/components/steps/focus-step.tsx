"use client";

import { StatementScene } from "@/features/onboarding/components/statement-scene";
import { Button } from "@/shared/ui/button";
import { GOAL_RESPONSE } from "@/features/onboarding/copy";
import type { PrimaryGoalValue } from "@/features/onboarding/schemas";

/**
 * Nova's reply to the goal. This is the scene that converts a list selection
 * into a commitment — the user picked an option and Nova says what it will
 * actually do about it. Copy lives in GOAL_RESPONSE, keyed by the goal.
 */
export function FocusStep({
  goal,
  onNext,
  onBack,
}: {
  goal: PrimaryGoalValue;
  onNext: () => void;
  onBack?: () => void;
}) {
  const response = GOAL_RESPONSE[goal];

  return (
    <StatementScene
      title={response.title}
      body={response.body}
      onBack={onBack}
      footer={
        <Button className="w-full" size="lg" onClick={onNext}>
          Дальше
        </Button>
      }
    />
  );
}
