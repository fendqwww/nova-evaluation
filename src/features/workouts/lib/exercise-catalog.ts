import type { MuscleGroup } from "@/features/workouts/lib/exercise-visual";

/**
 * Справочник упражнений — то, чего у тренировок не было.
 *
 * ПОЧЕМУ ОН ПОЯВИЛСЯ. Название упражнения здесь свободная строка: человек
 * открывал план, жал «Добавить упражнение» и получал пустое поле с подсказкой
 * «Например: жим лёжа». Дальше он либо вспоминал названия сам, либо писал
 * «жим 2» и «спина» — и то и другое ломало всё, что построено на имени:
 * прогресс по упражнению (exercise-progress-list), картинку и группу мышц
 * (exercise-visual), поиск в списке тренировок. Свободный ввод остался — он и
 * должен остаться, у людей есть свои движения, — но перестал быть единственным
 * входом.
 *
 * ПОЧЕМУ КАРТИНКА ЗАДАНА ЗДЕСЬ, А НЕ ВЫВОДИТСЯ ИЗ НАЗВАНИЯ. Разбор ключевых
 * слов (exercise-visual) неизбежно ошибается на составных названиях, и ошибка
 * видна на экране: «жим ногами» показывался грудью, «подъём ног» — спиной,
 * потому что «жим» и «тяга» — самые широкие слова в языке этого раздела. Для
 * упражнения из каталога гадать не нужно: мы знаем, что это, и записываем
 * прямо. Разбор по словам остаётся для того, что человек ввёл руками.
 *
 * `image: null` — не пробел в данных, а нормальное состояние: снимков в
 * /public/exercises одиннадцать, упражнений здесь под шестьдесят, и там, где
 * снимка нет, рисуется схема работающих мышц (MuscleMap). Она честнее чужой
 * картинки: подставить «жим лёжа» к приседу — хуже, чем не подставить ничего.
 */

/** Вкладки справочника. Это части тела, как их называют в зале, а не enum БД. */
export type CatalogCategoryId =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio";

export interface CatalogExercise {
  /** Стабильный ключ. Не показывается, используется как React key. */
  id: string;
  /** Ровно то, что попадёт в план как название. */
  name: string;
  /** Какая группа работает — для схемы мышц и подписи. */
  group: MuscleGroup;
  /** Чем делается. Вторая половина подписи в списке. */
  equipment: string;
  /** Файл в /public/exercises без расширения, либо null — тогда схема мышц. */
  image: string | null;
  /**
   * Схема подходов по умолчанию. Не «правильная тренировка», а разумная
   * отправная точка: человек всё равно поправит её в редакторе, но пустые
   * поля пришлось бы заполнять с нуля каждый раз.
   */
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface CatalogCategory {
  id: CatalogCategoryId;
  label: string;
  exercises: CatalogExercise[];
}

/** Силовая схема по умолчанию — база, подсобка, изоляция, кардио. */
const COMPOUND = { sets: 4, reps: 8, restSeconds: 120 };
const ACCESSORY = { sets: 3, reps: 12, restSeconds: 90 };
const ISOLATION = { sets: 3, reps: 15, restSeconds: 60 };
const CARDIO = { sets: 1, reps: 1, restSeconds: 0 };

export const EXERCISE_CATALOG: CatalogCategory[] = [
  {
    id: "chest",
    label: "Грудь",
    exercises: [
      { id: "bench-press", name: "Жим лёжа", group: "chest", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "incline-bench", name: "Жим лёжа в наклоне", group: "chest", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "db-press", name: "Жим гантелей лёжа", group: "chest", equipment: "Гантели", image: null, ...COMPOUND },
      { id: "db-fly", name: "Разводка гантелей", group: "chest", equipment: "Гантели", image: null, ...ACCESSORY },
      { id: "chest-dips", name: "Отжимания на брусьях", group: "chest", equipment: "Свой вес", image: "triceps-dips", ...ACCESSORY },
      { id: "cable-crossover", name: "Кроссовер", group: "chest", equipment: "Блок", image: null, ...ISOLATION },
      { id: "pec-deck", name: "Сведение в тренажёре", group: "chest", equipment: "Тренажёр", image: null, ...ISOLATION },
      { id: "push-ups", name: "Отжимания от пола", group: "chest", equipment: "Свой вес", image: null, ...ACCESSORY },
    ],
  },
  {
    id: "back",
    label: "Спина",
    exercises: [
      { id: "pull-ups", name: "Подтягивания", group: "back", equipment: "Свой вес", image: null, ...COMPOUND },
      { id: "lat-pulldown", name: "Тяга верхнего блока", group: "back", equipment: "Блок", image: null, ...ACCESSORY },
      { id: "barbell-row", name: "Тяга штанги в наклоне", group: "back", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "db-row", name: "Тяга гантели в наклоне", group: "back", equipment: "Гантели", image: null, ...ACCESSORY },
      { id: "seated-row", name: "Горизонтальная тяга", group: "back", equipment: "Блок", image: null, ...ACCESSORY },
      { id: "deadlift", name: "Становая тяга", group: "back", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "hyperextension", name: "Гиперэкстензия", group: "back", equipment: "Свой вес", image: null, ...ACCESSORY },
      { id: "face-pull", name: "Тяга каната к лицу", group: "back", equipment: "Блок", image: "shoulders-rear-delt", ...ISOLATION },
      { id: "shrugs", name: "Шраги со штангой", group: "shoulders", equipment: "Штанга", image: "shoulders-shrug-barbell", ...ACCESSORY },
    ],
  },
  {
    id: "legs",
    label: "Ноги",
    exercises: [
      { id: "squat", name: "Приседания со штангой", group: "legs", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "leg-press", name: "Жим ногами", group: "legs", equipment: "Тренажёр", image: null, ...COMPOUND },
      { id: "romanian-deadlift", name: "Румынская тяга", group: "legs", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "lunges", name: "Выпады", group: "legs", equipment: "Гантели", image: null, ...ACCESSORY },
      { id: "bulgarian-split", name: "Болгарские выпады", group: "legs", equipment: "Гантели", image: null, ...ACCESSORY },
      { id: "leg-curl", name: "Сгибание ног", group: "legs", equipment: "Тренажёр", image: null, ...ISOLATION },
      { id: "leg-extension", name: "Разгибание ног", group: "legs", equipment: "Тренажёр", image: null, ...ISOLATION },
      { id: "calf-raise", name: "Подъёмы на носки", group: "legs", equipment: "Тренажёр", image: null, ...ISOLATION },
      { id: "glute-bridge", name: "Ягодичный мостик", group: "glutes", equipment: "Штанга", image: null, ...ACCESSORY },
    ],
  },
  {
    id: "shoulders",
    label: "Плечи",
    exercises: [
      { id: "overhead-press", name: "Армейский жим", group: "shoulders", equipment: "Штанга", image: null, ...COMPOUND },
      { id: "db-shoulder-press", name: "Жим гантелей сидя", group: "shoulders", equipment: "Гантели", image: null, ...ACCESSORY },
      { id: "lateral-raise", name: "Махи в стороны", group: "shoulders", equipment: "Гантели", image: null, ...ISOLATION },
      { id: "rear-delt-fly", name: "Обратная разводка", group: "shoulders", equipment: "Гантели", image: "shoulders-rear-delt", ...ISOLATION },
      { id: "upright-row", name: "Тяга к подбородку", group: "shoulders", equipment: "Штанга", image: "shoulders-upright-row", ...ACCESSORY },
      { id: "arnold-press", name: "Жим Арнольда", group: "shoulders", equipment: "Гантели", image: null, ...ACCESSORY },
      { id: "db-shrugs", name: "Шраги с гантелями", group: "shoulders", equipment: "Гантели", image: "shoulders-shrug", ...ACCESSORY },
    ],
  },
  {
    id: "arms",
    label: "Руки",
    exercises: [
      { id: "barbell-curl", name: "Подъём штанги на бицепс", group: "biceps", equipment: "Штанга", image: "biceps-curl", ...ACCESSORY },
      { id: "db-curl", name: "Подъём гантелей на бицепс", group: "biceps", equipment: "Гантели", image: "biceps-curl", ...ACCESSORY },
      { id: "hammer-curl", name: "Молотки", group: "biceps", equipment: "Гантели", image: "biceps-curl", ...ACCESSORY },
      { id: "french-press", name: "Французский жим", group: "triceps", equipment: "Штанга", image: "triceps-french-press", ...ACCESSORY },
      { id: "triceps-pushdown", name: "Разгибание на блоке", group: "triceps", equipment: "Блок", image: "triceps-pushdown", ...ISOLATION },
      { id: "close-grip-press", name: "Жим узким хватом", group: "triceps", equipment: "Штанга", image: "triceps-close-grip", ...COMPOUND },
      { id: "overhead-extension", name: "Разгибание из-за головы", group: "triceps", equipment: "Гантели", image: "triceps-overhead", ...ISOLATION },
      { id: "bench-dips", name: "Обратные отжимания", group: "triceps", equipment: "Свой вес", image: "triceps-bench-dip", ...ACCESSORY },
    ],
  },
  {
    id: "core",
    label: "Пресс",
    exercises: [
      // Планка меряется секундами, а не повторами: подход один, «повторение» —
      // это удержание. Ставим 3 × 1, чтобы человек записал время в заметке, а не
      // делал «пятнадцать планок».
      { id: "plank", name: "Планка", group: "core", equipment: "Свой вес", image: null, sets: 3, reps: 1, restSeconds: 60 },
      { id: "side-plank", name: "Боковая планка", group: "core", equipment: "Свой вес", image: null, sets: 3, reps: 1, restSeconds: 45 },
      { id: "crunches", name: "Скручивания", group: "core", equipment: "Свой вес", image: null, ...ISOLATION },
      { id: "oblique-crunches", name: "Косые скручивания", group: "core", equipment: "Свой вес", image: null, ...ISOLATION },
      { id: "hanging-leg-raise", name: "Подъём ног в висе", group: "core", equipment: "Турник", image: null, ...ACCESSORY },
      { id: "lying-leg-raise", name: "Подъём ног лёжа", group: "core", equipment: "Свой вес", image: null, ...ISOLATION },
      { id: "bicycle", name: "Велосипед", group: "core", equipment: "Свой вес", image: null, ...ISOLATION },
      { id: "ab-wheel", name: "Ролик для пресса", group: "core", equipment: "Ролик", image: null, ...ACCESSORY },
    ],
  },
  {
    id: "cardio",
    label: "Кардио",
    exercises: [
      { id: "treadmill", name: "Беговая дорожка", group: "cardio", equipment: "Тренажёр", image: null, ...CARDIO },
      { id: "outdoor-run", name: "Бег на улице", group: "cardio", equipment: "Без оборудования", image: null, ...CARDIO },
      { id: "elliptical", name: "Эллипс", group: "cardio", equipment: "Тренажёр", image: null, ...CARDIO },
      { id: "stationary-bike", name: "Велотренажёр", group: "cardio", equipment: "Тренажёр", image: null, ...CARDIO },
      { id: "rowing", name: "Гребной тренажёр", group: "cardio", equipment: "Тренажёр", image: null, ...CARDIO },
      { id: "intervals", name: "Интервалы", group: "cardio", equipment: "Без оборудования", image: null, ...CARDIO },
      { id: "jump-rope", name: "Скакалка", group: "cardio", equipment: "Скакалка", image: null, ...CARDIO },
      { id: "walking", name: "Ходьба", group: "cardio", equipment: "Без оборудования", image: null, ...CARDIO },
    ],
  },
];

/**
 * Всё, что есть в каталоге, одним списком — для поиска, который не должен
 * упираться в выбранную вкладку.
 */
export const ALL_CATALOG_EXERCISES: CatalogExercise[] = EXERCISE_CATALOG.flatMap(
  (category) => category.exercises,
);

/** Регистр и «ё» — не различия: «Жим Лёжа» и «жим лежа» это одно упражнение. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/**
 * Упражнение каталога по названию — точное совпадение.
 *
 * Это мост между свободной строкой в базе и справочником: тренировка хранит
 * имя, а не id, потому что имя человек может переписать, и запись не должна от
 * этого осиротеть. Совпало — знаем группу и картинку точно; не совпало —
 * работает прежний разбор по ключевым словам.
 */
const BY_NAME = new Map<string, CatalogExercise>(
  ALL_CATALOG_EXERCISES.map((exercise) => [normalizeName(exercise.name), exercise]),
);

export function findCatalogExercise(name: string): CatalogExercise | null {
  return BY_NAME.get(normalizeName(name)) ?? null;
}

/**
 * Поиск по справочнику: название, оборудование или группа мышц — человек ищет
 * и «гантел», и «бицепс», и «жим», и все три запроса законны.
 */
export function searchCatalog(
  query: string,
  groupLabel: (group: MuscleGroup) => string,
): CatalogExercise[] {
  const q = normalizeName(query);
  if (q === "") return [];

  return ALL_CATALOG_EXERCISES.filter((exercise) =>
    normalizeName(`${exercise.name} ${exercise.equipment} ${groupLabel(exercise.group)}`).includes(q),
  );
}
