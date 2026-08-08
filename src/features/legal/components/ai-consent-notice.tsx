"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { Checkbox } from "@/shared/ui/checkbox";
import { AI_CONSENT_ID, consentDefinition, type ConsentId } from "@/features/legal/constants";
import { legalDocument } from "@/features/legal/documents";
import { LegalDocumentModal } from "@/features/legal/components/legal-document-modal";
import { useConsentForm, useConsentState } from "@/features/legal/hooks/use-consents";
import type { LegalDocument } from "@/features/legal/types";

/**
 * Что стоит между выключенным AI и включённым, когда согласия нет.
 *
 * Переключатели в этой группе намеренно не выдают согласие сами: тап по
 * тумблеру «AI Vision» не является согласием на передачу фотографии человека в
 * США, сколько бы удобнее это ни было. Поэтому сервер отказывает во включении
 * (см. update-ai.action.ts), а здесь появляется карточка, которая объясняет
 * отказ и открывает нормальную форму с текстом документа.
 *
 * Ничего не показывается, когда согласие есть, — то есть у подавляющего
 * большинства пользователей этой карточки не существует.
 */
export function AiConsentNotice() {
  const { state } = useConsentState();
  const [open, setOpen] = useState(false);

  const consent = state?.consents.find((item) => item.id === AI_CONSENT_ID);
  if (!state || consent?.granted) return null;

  return (
    <>
      <Card elevation="inset">
        <div className="flex flex-col gap-3 p-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-caption text-muted-foreground">
              AI-функции выключены: нет согласия на передачу данных в Google LLC (США).
              Без него коуч отвечает по собственным расчётам Nova, а анализ фото недоступен.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Дать согласие
          </Button>
        </div>
      </Card>

      <AiConsentModal
        open={open}
        onOpenChange={setOpen}
        alreadyGranted={state.consents
          .filter((item) => item.granted)
          .map((item) => item.id)
          .slice()}
      />
    </>
  );
}

function AiConsentModal({
  open,
  onOpenChange,
  alreadyGranted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyGranted: ConsentId[];
}) {
  const definition = consentDefinition(AI_CONSENT_ID);
  const [document, setDocument] = useState<LegalDocument | null>(null);

  // Ранее данные согласия переносятся как есть: экран включения AI не должен
  // случайно отозвать то, что человек подтвердил при регистрации.
  const { granted, setGranted, submit, isSubmitting, error } = useConsentForm(alreadyGranted);

  const checked = granted.includes(AI_CONSENT_ID);

  async function confirm() {
    await submit();
    onOpenChange(false);
  }

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        <ModalContent className="max-h-[88vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>Передача данных для AI</ModalTitle>
            <ModalDescription>
              Это отдельное согласие. Его можно отозвать в любой момент в разделе
              «Документы и согласия».
            </ModalDescription>
          </ModalHeader>

          <Checkbox
            checked={checked}
            onCheckedChange={(next) =>
              setGranted(
                next
                  ? [...granted, AI_CONSENT_ID]
                  : granted.filter((item) => item !== AI_CONSENT_ID),
              )
            }
            disabled={isSubmitting}
            label={definition.label}
            hint={definition.hint}
            footnote={
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {definition.documents.map((documentId) => (
                  <button
                    key={documentId}
                    type="button"
                    onClick={() => setDocument(legalDocument(documentId))}
                    className="text-accent underline underline-offset-2"
                  >
                    {legalDocument(documentId).shortTitle}
                  </button>
                ))}
              </span>
            }
          />

          {error && <p className="pt-3 text-caption text-destructive">{error}</p>}

          <div className="pt-4">
            <Button
              className="w-full"
              disabled={!checked || isSubmitting}
              onClick={() => void confirm()}
            >
              {isSubmitting ? "Сохраняем…" : "Подтвердить"}
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <LegalDocumentModal
        document={document}
        open={document !== null}
        onOpenChange={(next) => !next && setDocument(null)}
      />
    </>
  );
}
