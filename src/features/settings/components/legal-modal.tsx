"use client";

import { Card } from "@/shared/ui/card";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { formatDayNumeric } from "@/features/settings/lib/format";
import type { LegalDocument } from "@/features/settings/lib/legal";
import type { DateFormat } from "@/features/settings/types";

/**
 * The policy and the terms, rendered from structured sections.
 *
 * One component for both documents — they are the same shape, and giving each
 * its own screen would be two places to change when the wording moves. The
 * "черновик" notice at the bottom is not decoration: the text describes what
 * the code actually does today but has not been through a lawyer, and a user
 * reading it deserves to know which of those two it is.
 */
export function LegalModal({
  document,
  open,
  onOpenChange,
  dateFormat,
}: {
  document: LegalDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFormat: DateFormat;
}) {
  if (!document) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{document.title}</ModalTitle>
          <ModalDescription>
            Обновлено {formatDayNumeric(document.updated, dateFormat)}
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-5">
          <p className="text-body text-lead-foreground">{document.intro}</p>

          {document.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-2">
              <h3 className="text-heading text-foreground">{section.title}</h3>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-caption text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <Card elevation="inset">
            <p className="p-3.5 text-caption text-muted-foreground">
              Документ описывает текущее поведение приложения и будет заменён
              финальной юридической редакцией до публичного запуска.
            </p>
          </Card>
        </div>
      </ModalContent>
    </Modal>
  );
}
