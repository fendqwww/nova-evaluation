import { TELEGRAM_SUPPORT_HANDLE, TELEGRAM_SUPPORT_URL } from "@/shared/config/support";

/**
 * Кто такой «Оператор» — в одном месте, потому что это слово стоит в каждом из
 * четырёх юридических документов.
 *
 * ⚠️ РЕКВИЗИТЫ НЕ ЗАПОЛНЕНЫ И НЕ МОГУТ БЫТЬ ПРИДУМАНЫ.
 *
 * 152-ФЗ (ч. 4 ст. 9) требует, чтобы в согласии были указаны наименование и
 * адрес оператора; ЗоЗПП и ГК требуют того же от оферты. Пустая строка здесь —
 * это не недоделка, а осознанный отказ подставить выдуманное ООО в документ,
 * который потом предъявят в суде или в Роскомнадзоре. Пока значение пустое,
 * приложение показывает документы с явной пометкой «черновик, реквизиты не
 * заполнены» (см. isOperatorConfigured) — то есть врать пользователю оно тоже
 * не начинает.
 *
 * Перед публичным запуском заполнить всё ниже и снять пометку. Это последнее
 * действие, которое нужно от юриста и от учредителя, а не от разработчика.
 */
export interface OperatorDetails {
  /** Полное наименование: «ИП Иванов Иван Иванович» / «ООО "Нова"». */
  legalName: string;
  /** Краткое имя в тексте документов. */
  shortName: string;
  /** ИНН. */
  inn: string;
  /** ОГРН или ОГРНИП. */
  ogrn: string;
  /** Юридический (для ИП — адрес регистрации) адрес. */
  address: string;
  /** Почта для юридически значимых обращений и запросов субъектов ПД. */
  email: string;
  /**
   * Ответственный за организацию обработки персональных данных (ст. 22.1
   * 152-ФЗ). Для ИП без работников — сам ИП.
   */
  dataProtectionOfficer: string;
  /**
   * Регистрационный номер в реестре операторов ПД, полученный после уведомления
   * Роскомнадзора (ч. 1 ст. 22 152-ФЗ). Уведомление подаётся ДО начала
   * обработки.
   */
  rknRegistryNumber: string;
}

export const OPERATOR: OperatorDetails = {
  legalName: "",
  shortName: "NOVA",
  inn: "",
  ogrn: "",
  address: "",
  email: "",
  dataProtectionOfficer: "",
  rknRegistryNumber: "",
};

/** Заполнены ли реквизиты. Пока false — документы помечены как черновик. */
export function isOperatorConfigured(): boolean {
  return (
    OPERATOR.legalName.trim() !== "" &&
    OPERATOR.inn.trim() !== "" &&
    OPERATOR.address.trim() !== "" &&
    OPERATOR.email.trim() !== ""
  );
}

/**
 * Как оператор называется внутри текста документа.
 *
 * Плейсхолдер «___» вместо выдуманного названия: пропуск в документе виден и
 * читателю, и тому, кто будет его вычитывать, а правдоподобное «ООО "Нова"»
 * прошло бы мимо обоих.
 */
export function operatorName(): string {
  return OPERATOR.legalName.trim() || "«___» (реквизиты будут указаны до запуска)";
}

export function operatorContact(): string {
  return OPERATOR.email.trim() || TELEGRAM_SUPPORT_HANDLE;
}

/**
 * Строка реквизитов для подвала оферты и раздела «Контакты» политики.
 * Пустые поля не печатаются — строка с «ИНН: » и пустотой хуже её отсутствия.
 */
export function operatorRequisites(): string[] {
  const rows: Array<[string, string]> = [
    ["Наименование", OPERATOR.legalName],
    ["ИНН", OPERATOR.inn],
    ["ОГРН/ОГРНИП", OPERATOR.ogrn],
    ["Адрес", OPERATOR.address],
    ["Электронная почта", OPERATOR.email],
    ["Ответственный за обработку персональных данных", OPERATOR.dataProtectionOfficer],
    ["Регистрационный номер в реестре операторов ПД", OPERATOR.rknRegistryNumber],
  ];

  return rows
    .filter(([, value]) => value.trim() !== "")
    .map(([label, value]) => `${label}: ${value}.`);
}

/**
 * Обработчик, которому поручена обработка (ч. 3 ст. 6 152-ФЗ), и он же —
 * получатель трансграничной передачи (ст. 12).
 *
 * Назван прямо, с юрисдикцией: «провайдер языковой модели» в документе,
 * который должен раскрывать состав передачи, не раскрывает ничего.
 */
export const AI_PROCESSOR = {
  name: "Google LLC",
  service: "Google Gemini API",
  address: "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA",
  country: "США",
  policyUrl: "https://policies.google.com/privacy",
  termsUrl: "https://ai.google.dev/gemini-api/terms",
} as const;

/** Платформа, через которую выполняется вход. */
export const AUTH_PLATFORM = {
  name: "Telegram Messenger Inc.",
  policyUrl: "https://telegram.org/privacy",
} as const;

/** Минимальный возраст пользователя. */
export const MINIMUM_AGE = 18;

export const SUPPORT_CHANNEL = {
  handle: TELEGRAM_SUPPORT_HANDLE,
  url: TELEGRAM_SUPPORT_URL,
} as const;
