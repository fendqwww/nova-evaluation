/**
 * Что за упражнение записано — по его названию.
 *
 * ПОЧЕМУ ПО НАЗВАНИЮ, А НЕ ПО СПРАВОЧНИКУ. У упражнения здесь нет справочника и
 * не будет: имя — свободная строка, которую человек пишет сам («жим лёжа»,
 * «жим», «жим гантелей 30°»), и каталог движений на русском был бы неверен для
 * половины пользователей. Разбор ключевых слов ничего не запрещает и ничего не
 * навязывает: не опознали — показываем нейтральный силуэт, а не пустоту и не
 * чужое упражнение.
 *
 * ПОЧЕМУ НЕ ФОТО И НЕ ГИФКИ. Их пришлось бы либо лицензировать, либо
 * генерировать, и в обоих случаях везти мегабайты в Mini App, который и так
 * открывается внутри Telegram. Схема работающих мышц отвечает на тот же вопрос
 * («что это и что тут работает»), весит килобайты, живёт в теме приложения и
 * не может протухнуть.
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "core"
  | "cardio"
  | "fullBody";

export interface ExerciseVisual {
  group: MuscleGroup;
  /** Что подписать под схемой. */
  label: string;
  /**
   * Путь к картинке в /public, если для этого движения она есть.
   *
   * null — картинки нет, и это нормальное состояние, а не сбой: набор
   * иллюстраций закрывает пока плечи, трицепс и бицепс. Компонент показывает
   * вместо неё группу мышц словом, а не пустую рамку.
   */
  image: string | null;
}

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Грудь",
  back: "Спина",
  shoulders: "Плечи",
  biceps: "Бицепс",
  triceps: "Трицепс",
  legs: "Ноги",
  glutes: "Ягодицы",
  core: "Пресс",
  cardio: "Кардио",
  fullBody: "Всё тело",
};

/**
 * Ключевые слова, от узких к широким.
 *
 * ПОРЯДОК ЗДЕСЬ — ЭТО ЛОГИКА, А НЕ ОФОРМЛЕНИЕ. «Жим ногами» обязан совпасть с
 * ногами раньше, чем со словом «жим», иначе окажется упражнением на грудь.
 * Поэтому составные и уточняющие сочетания стоят выше одиночных слов, и новые
 * следует дописывать по тому же правилу.
 */
const RULES: ReadonlyArray<{ group: MuscleGroup; patterns: readonly string[] }> = [
  // Составные — раньше одиночных.
  { group: "legs", patterns: ["жим ног", "жим ногами", "разгибание ног", "сгибание ног"] },
  { group: "shoulders", patterns: ["жим стоя", "жим сидя", "армейск", "махи", "развод"] },
  { group: "triceps", patterns: ["французск", "разгибание рук", "узким хватом", "трицепс"] },
  { group: "biceps", patterns: ["подъём на бицепс", "сгибание рук", "бицепс", "молот"] },

  { group: "chest", patterns: ["жим лёж", "жим леж", "грудь", "отжим", "бабочка", "сведение"] },
  {
    group: "back",
    patterns: ["тяга", "подтягив", "спина", "широчайш", "пуловер", "гиперэкстенз"],
  },
  { group: "shoulders", patterns: ["плеч", "дельт", "протяжк"] },
  {
    group: "legs",
    patterns: ["присед", "выпад", "квадрицепс", "икр", "голен", "ног", "болгарск"],
  },
  { group: "glutes", patterns: ["ягодиц", "ягодичн", "мостик", "отведение бедра"] },
  { group: "core", patterns: ["пресс", "планк", "скручив", "кор ", "вакуум", "подъём ног"] },
  {
    group: "cardio",
    patterns: ["бег", "велосипед", "дорожк", "эллипс", "скакалк", "гребл", "плавани", "ходьб"],
  },
  {
    group: "fullBody",
    patterns: ["становая", "берпи", "рывок", "толчок", "трастер", "кроссфит", "комплекс"],
  },
  // Самое широкое — в самом низу: «жим» без уточнения чаще всего про грудь.
  { group: "chest", patterns: ["жим"] },
];

/**
 * Картинка под конкретное движение.
 *
 * ПОРЯДОК ТОТ ЖЕ, ЧТО И У ГРУПП, И ПО ТОЙ ЖЕ ПРИЧИНЕ: сначала узкие сочетания,
 * потом широкие. «Жим узким хватом» обязан совпасть раньше, чем «жим».
 *
 * Иллюстрации нарезаны из трёх исходных листов и лежат в /public/exercises.
 * Покрыты плечи, трицепс и бицепс — там, где источника нет, картинки нет тоже,
 * и это видно по коду, а не выясняется на экране.
 */
const IMAGE_RULES: ReadonlyArray<{ image: string; patterns: readonly string[] }> = [
  { image: "triceps-close-grip", patterns: ["узким хватом", "жим узким"] },
  { image: "triceps-french-press", patterns: ["французск", "лежа на трицепс", "лёжа на трицепс"] },
  { image: "triceps-pushdown", patterns: ["разгибание на блоке", "блок на трицепс", "пушдаун"] },
  { image: "triceps-dips", patterns: ["брусья", "брусьях"] },
  { image: "triceps-bench-dip", patterns: ["отжимания от скамьи", "обратные отжимания"] },
  { image: "triceps-overhead", patterns: ["из-за головы", "из за головы", "разгибание рук"] },

  { image: "shoulders-shrug-barbell", patterns: ["шраги со штангой", "шраги штанг"] },
  { image: "shoulders-shrug", patterns: ["шраги", "трапеци"] },
  { image: "shoulders-rear-delt", patterns: ["развод", "разведени", "задняя дельт", "махи в наклоне"] },
  { image: "shoulders-upright-row", patterns: ["протяжк", "тяга к подбородку"] },

  { image: "biceps-curl", patterns: ["на бицепс", "бицепс", "сгибание рук", "молот"] },
];

function imageFor(normalized: string): string | null {
  for (const rule of IMAGE_RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(pattern.replace(/ё/g, "е"))) {
        return `/exercises/${rule.image}.webp`;
      }
    }
  }
  return null;
}

/** Одна картинка на группу — когда конкретное движение не опознано. */
const GROUP_IMAGE: Partial<Record<MuscleGroup, string>> = {
  triceps: "/exercises/triceps-pushdown.webp",
  shoulders: "/exercises/shoulders-upright-row.webp",
  biceps: "/exercises/biceps-curl.webp",
};

/**
 * Определить группу мышц и картинку по названию.
 *
 * Регистр и «ё» нормализуются: человек пишет и «Жим Лёжа», и «жим лежа», и это
 * одно упражнение.
 */
export function exerciseVisual(name: string): ExerciseVisual {
  const normalized = name.toLowerCase().replace(/ё/g, "е").trim();
  const exact = imageFor(normalized);

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(pattern.replace(/ё/g, "е"))) {
        return {
          group: rule.group,
          label: GROUP_LABELS[rule.group],
          image: exact ?? GROUP_IMAGE[rule.group] ?? null,
        };
      }
    }
  }

  // Не опознали — это честное «упражнение без определённой группы», а не
  // ошибка: подпись скажет то же самое, картинки не будет.
  return { group: "fullBody", label: GROUP_LABELS.fullBody, image: exact };
}
