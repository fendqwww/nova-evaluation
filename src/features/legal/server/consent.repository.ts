import "server-only";
import { db } from "@/server/db";
import {
  AI_CONSENT_ID,
  CONSENTS,
  REQUIRED_CONSENTS,
  consentVersion,
  type ConsentId,
} from "@/features/legal/constants";
import type { ConsentSource, ConsentState, ConsentStatus } from "@/features/legal/types-consent";

/**
 * Хранение и чтение согласий.
 *
 * Единственное место, которое знает, что «согласие есть» — это строка с
 * актуальной версией и без даты отзыва. Всё остальное приложение спрашивает
 * hasAiConsent / getConsentState и не заглядывает в таблицу: обработка данных
 * без основания — это не баг конкретного экрана, а нарушение, и решать его
 * должен один модуль.
 */

/** Согласие действует: дано, не отозвано и подтверждает текущую редакцию. */
function toStatus(
  id: ConsentId,
  row: { version: string; acceptedAt: Date; revokedAt: Date | null } | undefined,
): ConsentStatus {
  const current = consentVersion(id);

  if (!row || row.revokedAt !== null) {
    return {
      id,
      granted: false,
      outdated: false,
      version: null,
      currentVersion: current,
      acceptedAt: null,
      revokedAt: row?.revokedAt?.toISOString() ?? null,
    };
  }

  return {
    id,
    // Устаревшая редакция — это не «согласия нет», а «согласие есть, но на
    // прежний текст». Различие важное: обработка по нему законна до момента,
    // когда пользователю показали новую редакцию, и именно поэтому Сервис
    // спрашивает заново, а не выключается молча.
    granted: true,
    outdated: row.version !== current,
    version: row.version,
    currentVersion: current,
    acceptedAt: row.acceptedAt.toISOString(),
    revokedAt: null,
  };
}

export async function getConsentState(userId: string): Promise<ConsentState> {
  const rows = await db.userConsent.findMany({
    where: { userId },
    select: { consentId: true, version: true, acceptedAt: true, revokedAt: true },
  });

  const byId = new Map(rows.map((row) => [row.consentId, row]));
  const consents = CONSENTS.map((definition) => toStatus(definition.id, byId.get(definition.id)));

  const missingRequired = consents.filter(
    (consent) => REQUIRED_CONSENTS.includes(consent.id) && !consent.granted,
  );
  const outdatedRequired = consents.filter(
    (consent) => REQUIRED_CONSENTS.includes(consent.id) && consent.granted && consent.outdated,
  );

  return {
    consents,
    // Что должен пересобрать экран повторного согласия: не данное и устаревшее
    // обязательное — вместе, потому что для пользователя это один и тот же
    // экран с одним и тем же действием.
    pending: [...missingRequired, ...outdatedRequired].map((consent) => consent.id),
    satisfied: missingRequired.length === 0 && outdatedRequired.length === 0,
  };
}

/**
 * Записать согласия одним действием.
 *
 * Не отдельными вызовами на каждую отметку: пользователь нажал одну кнопку, и
 * если запись половины согласий упадёт, аккаунт останется в состоянии, которое
 * невозможно объяснить ни ему, ни проверяющему. Транзакция делает акцепт
 * атомарным ровно в том смысле, в каком он атомарен для человека.
 *
 * Снятая отметка у необязательного согласия — это его отзыв, а не отсутствие
 * записи: пользователь мог дать его раньше и снять сейчас.
 */
export async function recordConsents(
  userId: string,
  granted: readonly ConsentId[],
  source: ConsentSource,
): Promise<void> {
  const now = new Date();

  await db.$transaction(
    CONSENTS.map((definition) => {
      const isGranted = granted.includes(definition.id);
      const version = consentVersion(definition.id);

      if (isGranted) {
        return db.userConsent.upsert({
          where: { userId_consentId: { userId, consentId: definition.id } },
          create: { userId, consentId: definition.id, version, acceptedAt: now, source },
          update: { version, acceptedAt: now, revokedAt: null, source },
        });
      }

      // Необязательное согласие, оставленное без отметки. Если строки не было,
      // создавать «отозванную» нечего — отзывать нечего.
      return db.userConsent.updateMany({
        where: { userId, consentId: definition.id, revokedAt: null },
        data: { revokedAt: now },
      });
    }),
  );
}

/** Отозвать одно согласие. Строка остаётся, проставляется дата отзыва. */
export async function revokeConsent(userId: string, consentId: ConsentId): Promise<void> {
  await db.userConsent.updateMany({
    where: { userId, consentId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Есть ли основание отправлять что-либо в Gemini.
 *
 * Узкий отдельный запрос, а не полное состояние: это проверяется перед каждым
 * обращением к модели, и читать ради одного булева три строки и сравнивать
 * версии документов было бы расточительно.
 *
 * Устаревшая редакция здесь намеренно считается действующим согласием.
 * Пользователь согласился на трансграничную передачу, текст с тех пор
 * поправили — выключать ему коуча до того, как он увидел новую редакцию, было
 * бы наказанием за нашу правку. Экран повторного согласия покажется на входе и
 * спросит заново.
 */
export async function hasAiConsent(userId: string): Promise<boolean> {
  const row = await db.userConsent.findUnique({
    where: { userId_consentId: { userId, consentId: AI_CONSENT_ID } },
    select: { revokedAt: true },
  });
  return row !== null && row.revokedAt === null;
}
