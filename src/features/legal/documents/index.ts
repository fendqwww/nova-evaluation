import { PRIVACY_POLICY } from "@/features/legal/documents/privacy";
import { PUBLIC_OFFER } from "@/features/legal/documents/offer";
import { DATA_CONSENT } from "@/features/legal/documents/consent";
import { RECOMMENDATION_RULES } from "@/features/legal/documents/recommendations";
import type { LegalDocument, LegalDocumentId } from "@/features/legal/types";

export { PRIVACY_POLICY, PUBLIC_OFFER, DATA_CONSENT, RECOMMENDATION_RULES };

/**
 * Все документы в порядке, в котором они показываются пользователю: сначала
 * договор, потом обработка данных, потом объяснение рекомендаций.
 */
export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  PUBLIC_OFFER,
  PRIVACY_POLICY,
  DATA_CONSENT,
  RECOMMENDATION_RULES,
];

const BY_ID: Record<LegalDocumentId, LegalDocument> = {
  offer: PUBLIC_OFFER,
  privacy: PRIVACY_POLICY,
  consent: DATA_CONSENT,
  recommendations: RECOMMENDATION_RULES,
};

export function legalDocument(id: LegalDocumentId): LegalDocument {
  return BY_ID[id];
}
