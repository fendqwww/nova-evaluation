import { LegalPage } from "@/features/landing/components/legal-page";
import { isOperatorConfigured } from "@/shared/config/legal";
import type { LegalDocument } from "@/features/legal/types";

/**
 * Публичная страница документа — из того же объекта, что и модалка в
 * приложении.
 *
 * До этого сайт и приложение печатали разные тексты под одинаковыми
 * заголовками, и расходились они не в стиле, а по существу: в приложении было
 * написано, что фотографии не отправляются в Google, на сайте — что
 * отправляются. Для документа, которым обосновывается обработка персональных
 * данных, это не рассинхрон контента, а два взаимоисключающих обещания. Один
 * источник — единственная защита от повторения.
 */
export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <LegalPage
      title={document.title}
      updatedAt={formatVersion(document.version)}
      intro={document.summary}
      blocks={document.sections.map((section) => ({
        heading: section.heading,
        paragraphs: section.paragraphs ?? [],
        bullets: section.bullets,
      }))}
    >
      {!isOperatorConfigured() && (
        <p className="mt-14 rounded-2xl border border-(--nova-hairline) p-5 text-[0.8125rem] text-(--nova-text-faint)">
          Черновик: реквизиты оператора ещё не заполнены. Документ описывает
          фактическую работу сервиса и будет дополнен реквизитами и финальной
          юридической редакцией до публичного запуска.
        </p>
      )}
    </LegalPage>
  );
}

/** "2026-08-08" → "8 августа 2026 г." */
function formatVersion(version: string): string {
  const date = new Date(`${version}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return version;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
