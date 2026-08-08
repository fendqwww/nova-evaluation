import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";
import { PRIVACY_POLICY } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: PRIVACY_POLICY.title,
  description: PRIVACY_POLICY.summary,
  robots: { index: true, follow: true },
};

// Текст живёт в features/legal/documents/privacy.ts — там же, откуда его
// читает приложение. Страница осталась одной строкой намеренно: любая правка
// текста здесь означала бы, что сайт и приложение снова разошлись.
export default function PrivacyPolicyPage() {
  return <LegalDocumentPage document={PRIVACY_POLICY} />;
}
