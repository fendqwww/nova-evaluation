import type { ConsentId } from "@/features/legal/constants";

/** Где пользователь поставил отметку — для восстановления картины постфактум. */
export type ConsentSource = "onboarding" | "reconsent" | "settings";

/**
 * Состояние одного согласия, как его видят и сервер, и экран.
 *
 * `granted` и `outdated` — разные вопросы. Первое: есть ли основание
 * обрабатывать данные. Второе: подтверждена ли действующая редакция. Согласие
 * может быть действующим и устаревшим одновременно — именно в этом состоянии
 * находится каждый пользователь в день, когда документ поправили.
 */
export interface ConsentStatus {
  id: ConsentId;
  granted: boolean;
  outdated: boolean;
  /** Редакция, которую подтвердил пользователь. Null, если согласия нет. */
  version: string | null;
  /** Действующая редакция сейчас. */
  currentVersion: string;
  /** ISO-момент акцепта. */
  acceptedAt: string | null;
  /** ISO-момент отзыва, если он был. */
  revokedAt: string | null;
}

export interface ConsentState {
  consents: readonly ConsentStatus[];
  /** Обязательные согласия, которых не хватает или которые устарели. */
  pending: readonly ConsentId[];
  /** Можно ли пускать пользователя в приложение. */
  satisfied: boolean;
}
