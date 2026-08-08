"use client";

import { useState } from "react";
import { Checkbox } from "@/shared/ui/checkbox";
import { CONSENTS, type ConsentId } from "@/features/legal/constants";
import { legalDocument } from "@/features/legal/documents";
import { LegalDocumentModal } from "@/features/legal/components/legal-document-modal";
import type { LegalDocument } from "@/features/legal/types";

/**
 * Три отметки и ссылки на документы под каждой.
 *
 * Ни одна не проставлена заранее и ни одна не проставляется по нажатию
 * «Продолжить». Это единственный способ, которым согласие может быть
 * «конкретным, информированным и сознательным» (часть 1 статьи 9 152-ФЗ):
 * галочка, поставленная приложением, выражает волю приложения.
 *
 * Необязательное согласие визуально не отличается от обязательных, но
 * подписано «можно не давать» — человек должен видеть, что у него есть выбор,
 * а не догадываться об этом по тому, что кнопка стала активной.
 */
export function ConsentForm({
  granted,
  onChange,
  disabled = false,
}: {
  granted: readonly ConsentId[];
  onChange: (granted: ConsentId[]) => void;
  disabled?: boolean;
}) {
  const [openDocument, setOpenDocument] = useState<LegalDocument | null>(null);

  function toggle(id: ConsentId, next: boolean) {
    onChange(next ? [...granted, id] : granted.filter((item) => item !== id));
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {CONSENTS.map((consent) => (
          <Checkbox
            key={consent.id}
            checked={granted.includes(consent.id)}
            onCheckedChange={(next) => toggle(consent.id, next)}
            disabled={disabled}
            label={
              <>
                {consent.label}
                {consent.required ? (
                  <span className="text-destructive"> *</span>
                ) : (
                  <span className="text-subtle-foreground"> — можно не давать</span>
                )}
              </>
            }
            hint={consent.hint}
            footnote={
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {consent.documents.map((documentId) => {
                  const document = legalDocument(documentId);
                  return (
                    <button
                      key={documentId}
                      type="button"
                      onClick={() => setOpenDocument(document)}
                      className="text-accent underline underline-offset-2"
                    >
                      {document.shortTitle}
                    </button>
                  );
                })}
              </span>
            }
          />
        ))}
      </div>

      <LegalDocumentModal
        document={openDocument}
        open={openDocument !== null}
        onOpenChange={(next) => !next && setOpenDocument(null)}
      />
    </>
  );
}
