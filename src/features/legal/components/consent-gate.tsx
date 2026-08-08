"use client";

import type { ReactNode } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { PageContainer } from "@/shared/ui/page-container";
import { AppLoadingScreen } from "@/shared/ui/app-loading-screen";
import { ConsentForm } from "@/features/legal/components/consent-form";
import { useConsentForm, useConsentState } from "@/features/legal/hooks/use-consents";
import type { ConsentId } from "@/features/legal/constants";

/**
 * Между пользователем и приложением, когда обязательное согласие отсутствует
 * или подтверждает устаревшую редакцию.
 *
 * Зачем экран, а не баннер: изменение существенных условий договора и порядка
 * обработки персональных данных требует нового акцепта, а не уведомления,
 * которое можно смахнуть. Баннер «мы обновили политику» — это доказательство
 * того, что человеку показали текст, но не того, что он с ним согласился.
 *
 * Кого он не задевает: пользователей, у которых всё подтверждено (99% открытий
 * приложения — один кэшированный запрос и никакого экрана), и новых
 * пользователей, которые видят те же отметки внутри онбординга. Ошибка запроса
 * тоже пропускает вперёд: между «показать экран согласия из-за упавшей сети» и
 * «пустить человека в приложение, где всё равно нечего обработать без
 * согласия» второе честнее — все AI-действия проверяют основание сами.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const { state, isPending, isError } = useConsentState();

  if (isPending) return <AppLoadingScreen />;
  if (isError || !state || state.satisfied) return <>{children}</>;

  const alreadyGranted = state.consents
    .filter((consent) => consent.granted)
    .map((consent) => consent.id);

  const isUpdate = state.consents.some((consent) => consent.acceptedAt !== null);

  return <ConsentScreen initialGranted={alreadyGranted} isUpdate={isUpdate} />;
}

function ConsentScreen({
  initialGranted,
  isUpdate,
}: {
  initialGranted: ConsentId[];
  isUpdate: boolean;
}) {
  const { granted, setGranted, canSubmit, submit, isSubmitting, error } =
    useConsentForm(initialGranted);

  return (
    <PageContainer className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <IconChip tone="ai" size="md">
          <ScrollText className="h-4 w-4" />
        </IconChip>
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
            {isUpdate ? "Документы обновились" : "Нужно ваше согласие"}
          </h1>
          <p className="text-caption text-muted-foreground">
            {isUpdate
              ? "Мы изменили редакцию документов. Чтобы продолжить пользоваться Nova, подтвердите их заново — отметки, которые вы давали раньше, уже проставлены."
              : "Nova работает с данными о вашем здоровье. Чтобы продолжить, подтвердите документы — открыть и прочитать их можно прямо здесь."}
          </p>
        </div>
      </header>

      <ConsentForm granted={granted} onChange={setGranted} disabled={isSubmitting} />

      <Card elevation="inset">
        <p className="p-3.5 text-caption text-muted-foreground">
          Ваши данные никуда не делись и остаются на месте. Если вы не готовы
          подтвердить обязательные пункты, напишите в поддержку — мы выгрузим ваш
          архив и удалим аккаунт.
        </p>
      </Card>

      {error && <p className="text-center text-caption text-destructive">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        disabled={!canSubmit || isSubmitting}
        onClick={() => void submit()}
      >
        {isSubmitting ? "Сохраняем…" : "Подтвердить"}
      </Button>
    </PageContainer>
  );
}
