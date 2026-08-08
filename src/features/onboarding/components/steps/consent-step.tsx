"use client";

import { StepShell } from "@/features/onboarding/components/step-shell";
import { Button } from "@/shared/ui/button";
import { ConsentForm } from "@/features/legal/components/consent-form";
import { useConsentForm } from "@/features/legal/hooks/use-consents";

/**
 * Первая сцена, на которой что-либо спрашивают, — и она стоит до имени, до
 * возраста и до веса намеренно.
 *
 * Согласие получают до начала обработки, а не в конце анкеты: анкета и есть
 * обработка. Прежний порядок — сначала шесть экранов о теле и целях, потом
 * галочка перед сохранением — означал бы, что данные о здоровье собраны без
 * основания, а «согласие» дано под давлением уже потраченного времени.
 *
 * Согласия записываются здесь же, а не вместе с профилем в конце. Пользователь,
 * который бросит онбординг на следующем экране, всё равно останется человеком,
 * который принял оферту, — и это ровно то, что произошло.
 */
export function ConsentStep({ onNext }: { onNext: () => void }) {
  const { granted, setGranted, canSubmit, submit, isSubmitting, error } = useConsentForm();

  async function accept() {
    await submit();
    onNext();
  }

  return (
    <StepShell
      title="Сначала — формальности"
      subtitle="Nova работает с данными о вашем здоровье, поэтому начинаем с согласия. Документы можно открыть и прочитать целиком прямо здесь."
      scrollable
      footer={
        <div className="flex flex-col gap-3">
          {error && <p className="text-center text-caption text-destructive">{error}</p>}
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit || isSubmitting}
            onClick={() => void accept()}
          >
            {isSubmitting ? "Сохраняем…" : "Принять и продолжить"}
          </Button>
          <p className="text-center text-[0.6875rem] text-subtle-foreground">
            Отметки со звёздочкой обязательны — без них Nova не сможет работать.
          </p>
        </div>
      }
    >
      <ConsentForm granted={granted} onChange={setGranted} disabled={isSubmitting} />
    </StepShell>
  );
}
