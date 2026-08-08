"use client";

import { useState } from "react";
import { FileText, ScrollText, Shield, Sparkles } from "lucide-react";
import { SettingsGroup, SettingsRow } from "@/features/settings/components/settings-group";
import { Card } from "@/shared/ui/card";
import { LEGAL_DOCUMENTS } from "@/features/legal/documents";
import { LegalDocumentModal } from "@/features/legal/components/legal-document-modal";
import { useConsentState, useRevokeConsent } from "@/features/legal/hooks/use-consents";
import { AI_CONSENT_ID, consentDefinition } from "@/features/legal/constants";
import { SUPPORT_CHANNEL } from "@/shared/config/legal";
import type { LegalDocument, LegalDocumentId } from "@/features/legal/types";

const ICONS: Record<LegalDocumentId, React.ReactNode> = {
  offer: <ScrollText className="h-4 w-4" />,
  privacy: <Shield className="h-4 w-4" />,
  consent: <FileText className="h-4 w-4" />,
  recommendations: <Sparkles className="h-4 w-4" />,
};

/**
 * Правовой раздел настроек: документы и состояние согласий.
 *
 * Здесь же — отзыв согласия на передачу данных в Google. Право отозвать
 * согласие ничего не стоит, если для его реализации нужно написать письмо и
 * ждать ответа: часть 2 статьи 9 152-ФЗ говорит «в любое время», и одна кнопка
 * ближе к этой формулировке, чем переписка.
 *
 * Обязательные согласия отзываются только через поддержку, и строка об этом
 * говорит прямо. Причина не в нежелании их отзывать, а в последствии: отзыв
 * означает удаление аккаунта со всей историей, и такое действие не должно
 * происходить от одного случайного тапа в списке настроек.
 */
export function LegalGroup() {
  const [openDocument, setOpenDocument] = useState<LegalDocument | null>(null);
  const { state } = useConsentState();
  const revoke = useRevokeConsent();

  const aiConsent = state?.consents.find((consent) => consent.id === AI_CONSENT_ID);

  return (
    <>
      <SettingsGroup title="Документы и согласия">
        {LEGAL_DOCUMENTS.map((document, index) => (
          <SettingsRow
            key={document.id}
            icon={ICONS[document.id]}
            tone={index === 0 ? "score" : undefined}
            label={document.shortTitle}
            hint={document.summary}
            value={`ред. ${document.version}`}
            onClick={() => setOpenDocument(document)}
          />
        ))}
      </SettingsGroup>

      {state && (
        <SettingsGroup title="Мои согласия">
          {state.consents.map((consent) => {
            const definition = consentDefinition(consent.id);
            const isAi = consent.id === AI_CONSENT_ID;

            return (
              <SettingsRow
                key={consent.id}
                icon={
                  isAi ? <Sparkles className="h-4 w-4" /> : <Shield className="h-4 w-4" />
                }
                label={definition.required ? definition.label.split(",")[0] : "Передача данных в Google (AI)"}
                hint={
                  consent.granted
                    ? `Дано ${formatMoment(consent.acceptedAt)}${consent.outdated ? " · редакция обновилась" : ""}`
                    : definition.required
                      ? "Не подтверждено"
                      : "Не дано — AI-функции выключены"
                }
                value={consent.granted ? "Активно" : "Нет"}
                // Отозвать можно только необязательное согласие, и только пока
                // оно действует.
                onClick={
                  isAi && consent.granted && !revoke.isPending
                    ? () => revoke.mutate(AI_CONSENT_ID)
                    : undefined
                }
              />
            );
          })}
        </SettingsGroup>
      )}

      <Card elevation="inset">
        <p className="p-3.5 text-caption text-muted-foreground">
          {aiConsent?.granted
            ? "Нажатие на строку согласия для AI отзывает его: передача данных в Google прекратится, AI-функции выключатся, остальное приложение продолжит работать."
            : "Согласие на передачу данных в Google можно дать заново — включите любой переключатель в разделе «AI»."}{" "}
          Отзыв согласия на обработку данных о здоровье означает удаление аккаунта — напишите
          в поддержку {SUPPORT_CHANNEL.handle}.
        </p>
      </Card>

      <LegalDocumentModal
        document={openDocument}
        open={openDocument !== null}
        onOpenChange={(next) => !next && setOpenDocument(null)}
      />
    </>
  );
}

/** «8 августа 2026» из ISO-момента. Null — для согласия, которого нет. */
function formatMoment(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/\s*г\.$/, "");
}
