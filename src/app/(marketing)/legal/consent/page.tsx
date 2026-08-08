import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";
import { DATA_CONSENT } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: DATA_CONSENT.title,
  description: DATA_CONSENT.summary,
  robots: { index: true, follow: true },
};

// Форма согласия публикуется отдельной страницей, а не прячется внутрь
// политики: человек, который уже дал согласие в приложении, должен иметь
// возможность прочитать его текст, не заходя в приложение, — в том числе чтобы
// сослаться на него в обращении.
export default function ConsentPage() {
  return <LegalDocumentPage document={DATA_CONSENT} />;
}
