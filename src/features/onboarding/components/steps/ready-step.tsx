"use client";

import { StatementScene } from "@/features/onboarding/components/statement-scene";
import { Button } from "@/shared/ui/button";
import { buildRecap } from "@/features/onboarding/copy";
import type { OnboardingProfileInput } from "@/features/onboarding/schemas";

/**
 * The closing scene: Nova repeating back what it heard.
 *
 * This replaced a theme picker as the final screen. A colour grid is a
 * settings panel, and ending on one made the last impression of onboarding
 * "configure the app" — while the theme itself is pure personalisation and now
 * lives in Профиль → Внешний вид. Ending on a recap makes the last impression
 * "Nova was listening", which is the entire promise of the product.
 */
export function ReadyStep({
  values,
  onFinish,
}: {
  values: Partial<OnboardingProfileInput>;
  onFinish: () => void;
}) {
  const recap = buildRecap(values);

  return (
    <StatementScene
      title="Всё, я тебя понял"
      body="Профиль готов. Дальше — первая цель или привычка, и Nova начнёт вести тебя по ней."
      footer={
        <Button className="w-full" size="lg" onClick={onFinish}>
          Перейти в Nova
        </Button>
      }
    >
      <dl className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {recap.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between px-4 py-3.5">
            <dt className="text-body text-muted-foreground">{row.label}</dt>
            <dd className="text-heading text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </StatementScene>
  );
}
