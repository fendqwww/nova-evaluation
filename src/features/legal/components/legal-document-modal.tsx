"use client";

import { Card } from "@/shared/ui/card";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { isOperatorConfigured } from "@/shared/config/legal";
import type { LegalDocument } from "@/features/legal/types";

/**
 * Любой из четырёх документов, целиком, внутри приложения.
 *
 * Именно целиком: согласие, которое ссылается на текст, доступный только в
 * браузере, — это согласие с текстом, которого человек не видел. Mini App
 * открывает внешние ссылки в отдельном окне поверх Telegram, и на экране
 * онбординга это означает уход из потока. Поэтому документ читается здесь же.
 *
 * Пометка внизу появляется, пока не заполнены реквизиты оператора
 * (shared/config/legal.ts). Она неприятная и должна быть неприятной: документ
 * без наименования и адреса оператора не является ни офертой, ни надлежащим
 * согласием, и делать вид, что является, — хуже, чем сказать об этом прямо.
 */
export function LegalDocumentModal({
  document,
  open,
  onOpenChange,
}: {
  document: LegalDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!document) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{document.title}</ModalTitle>
          <ModalDescription>Редакция от {document.version}</ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-5">
          <p className="text-body text-lead-foreground">{document.summary}</p>

          {document.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h3 className="text-heading text-foreground">{section.heading}</h3>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-caption text-muted-foreground">
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="flex flex-col gap-1.5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-accent"
                      />
                      <span className="text-caption text-muted-foreground">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {!isOperatorConfigured() && (
            <Card elevation="inset">
              <p className="p-3.5 text-caption text-muted-foreground">
                Черновик: реквизиты оператора ещё не заполнены. Текст описывает
                фактическую работу приложения и будет дополнен реквизитами и
                финальной юридической редакцией до публичного запуска.
              </p>
            </Card>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
