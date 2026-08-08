import type { Metadata } from "next";
import { LegalDocumentPage } from "@/features/legal/components/legal-document-page";
import { PUBLIC_OFFER } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: PUBLIC_OFFER.title,
  description: PUBLIC_OFFER.summary,
  robots: { index: true, follow: true },
};

export default function OfferPage() {
  return <LegalDocumentPage document={PUBLIC_OFFER} />;
}
