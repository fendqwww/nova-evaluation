import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";
import { RECOMMENDATION_RULES } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: RECOMMENDATION_RULES.title,
  description: RECOMMENDATION_RULES.summary,
  robots: { index: true, follow: true },
};

// Статья 10.2-2 149-ФЗ требует, чтобы правила применения рекомендательных
// технологий были размещены в открытом доступе — то есть именно здесь, на
// публичной странице, а не только внутри приложения за авторизацией.
export default function RecommendationRulesPage() {
  return <LegalDocumentPage document={RECOMMENDATION_RULES} />;
}
