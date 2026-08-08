import { MINIMUM_AGE } from "@/shared/config/legal";
import { legalDocument } from "@/features/legal/documents";
import type { LegalDocumentId } from "@/features/legal/types";

/**
 * Три согласия, которые пользователь даёт отдельными отметками.
 *
 * Разделены намеренно, и разделение — юридическое, а не оформительское:
 *
 *   1. `terms` — акцепт договора (оферта + Политика + подтверждение возраста).
 *      Основание обработки здесь — исполнение договора, а не согласие.
 *   2. `personal-data` — согласие на обработку персональных данных, включая
 *      сведения о состоянии здоровья. Статья 10 152-ФЗ требует, чтобы согласие
 *      на специальные категории было отдельным и осознанным; спрятанное внутрь
 *      «принимаю условия» оно считалось бы не полученным.
 *   3. `ai-transfer` — согласие на трансграничную передачу в США (статья 12).
 *      Единственное необязательное: закон запрещает обусловливать
 *      предоставление услуги согласием, которое для неё не требуется (часть 4
 *      статьи 9 152-ФЗ), а Сервис без AI работает полностью. Отказ выключает
 *      AI-функции — и это техническое следствие, а не наказание.
 *
 * Предварительно проставленных отметок нет ни у одной: молчание согласием не
 * является.
 */

export const CONSENT_IDS = ["terms", "personal-data", "ai-transfer"] as const;
export type ConsentId = (typeof CONSENT_IDS)[number];

export interface ConsentDefinition {
  id: ConsentId;
  /** Текст рядом с отметкой. Одно предложение, без отсылок к «условиям». */
  label: string;
  /** Пояснение под ним — что именно произойдёт. */
  hint: string;
  /** Обязательно ли для работы Сервиса. */
  required: boolean;
  /**
   * Документы, редакции которых фиксируются вместе с этим согласием. Изменение
   * версии любого из них у обязательного согласия требует повторного акцепта.
   */
  documents: readonly LegalDocumentId[];
}

export const CONSENTS: readonly ConsentDefinition[] = [
  {
    id: "terms",
    label: `Мне исполнилось ${MINIMUM_AGE} лет, я принимаю Публичную оферту и Политику конфиденциальности`,
    hint: "Договор об использовании NOVA и описание того, как обрабатываются данные.",
    required: true,
    documents: ["offer", "privacy"],
  },
  {
    id: "personal-data",
    label:
      "Я даю согласие на обработку персональных данных, включая сведения, относящиеся к состоянию здоровья",
    hint: "Вес, сон, питание, нагрузки и фотографии прогресса — без этого приложению нечего показывать.",
    required: true,
    documents: ["consent"],
  },
  {
    id: "ai-transfer",
    label:
      "Я даю согласие на трансграничную передачу данных в Google LLC (США) для работы AI-функций",
    hint: "Нужно для AI-коуча и анализа фото. Можно не давать сейчас и включить позже в настройках — остальное приложение работает полностью.",
    required: false,
    documents: ["consent", "recommendations"],
  },
];

export const REQUIRED_CONSENTS: readonly ConsentId[] = CONSENTS.filter(
  (consent) => consent.required,
).map((consent) => consent.id);

/** Согласие, без которого ничего не уходит в Gemini. */
export const AI_CONSENT_ID: ConsentId = "ai-transfer";

/**
 * Что видит пользователь, у которого этого согласия нет.
 *
 * Одна формулировка на все AI-экраны, и она называет причину, а не результат:
 * «функция недоступна» отправляет человека искать поломку, а «нужно согласие,
 * вот где его дать» — в настройки, где он за два тапа получит работающую
 * функцию.
 */
export const CONSENT_REQUIRED_MESSAGE =
  "Для работы AI нужно согласие на передачу данных в Google (США). Его можно дать в «Настройках» → «AI».";

export function consentDefinition(id: ConsentId): ConsentDefinition {
  const found = CONSENTS.find((consent) => consent.id === id);
  if (!found) throw new Error(`Unknown consent: ${id}`);
  return found;
}

/**
 * Версия согласия — самая поздняя из версий документов, которые оно
 * подтверждает.
 *
 * Одно поле вместо списка версий: сравнивать нужно ровно один раз — «то, с чем
 * человек согласился, устарело или нет». Правка любого из документов сдвигает
 * версию вперёд и заставляет спросить заново, а это ровно то поведение, о
 * котором говорит раздел «Изменения» в самой Политике.
 */
export function consentVersion(id: ConsentId): string {
  return consentDefinition(id)
    .documents.map((documentId) => legalDocument(documentId).version)
    .reduce((latest, version) => (version > latest ? version : latest));
}
