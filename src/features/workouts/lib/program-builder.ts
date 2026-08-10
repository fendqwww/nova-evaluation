/**
 * Программа, собранная без модели.
 *
 * ЗАЧЕМ ЭТО ГЛАВНОЕ, А НЕ ЗАПАСНОЕ — тот же аргумент, что и у шаблонных путей
 * (см. features/path/lib/template-plans.ts): «не знаешь, какую программу
 * выбрать?» — это обещание, которое обязано выполняться при отсутствии ключа к
 * API, на исчерпанном лимите, при таймауте и на невалидном ответе. Модель
 * получает собранную здесь программу черновиком и улучшает её под человека.
 *
 * ПОЧЕМУ ПРОГРАММА СОБИРАЕТСЯ, А НЕ ВЫБИРАЕТСЯ ИЗ СПИСКА. Комбинаций
 * цель × уровень × оборудование — восемнадцать, и восемнадцать написанных руками
 * программ невозможно поддерживать в согласованном виде: правка схемы подходов
 * для похудения потребовала бы шести правок. Поэтому здесь три независимые
 * составляющие:
 *
 *   движения  — пул упражнений по оборудованию, разложенный по паттернам
 *               (приседание, наклон, жим, тяга, корпус, кардио);
 *   структура — какие паттерны в какой день, по уровню: новичку всё тело
 *               дважды-трижды в неделю, опытному верх/низ четырьмя днями;
 *   схема     — подходы, повторы и отдых по цели.
 *
 * ОТКУДА ЦИФРЫ. Диапазоны общепринятые и те же, что в уроках Академии: 6–8
 * повторений с отдыхом 2–3 минуты — работа на силу и массу; 10–12 с отдыхом
 * 60–90 секунд — объёмная работа, которая лучше переносится на дефиците; 48 часов
 * между силовыми на одну группу мышц — отсюда дни через день, а не подряд.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Ни весов в килограммах, ни процентов от максимума: приложение
 * не знает силовых показателей человека, и подставлять «приседания 60 кг» было бы
 * утверждением о нём, которого никто не делал. Вес остаётся пустым — его
 * заполняет первая тренировка.
 */

import type {
  ProgramEquipment,
  ProgramGoal,
  ProgramLevel,
  ProgramPlan,
} from "@/features/workouts/lib/program-plan";
import {
  PROGRAM_EQUIPMENT_LABELS,
  PROGRAM_GOAL_LABELS,
} from "@/features/workouts/lib/program-plan";

/** Двигательные паттерны, из которых собирается день. */
type Pattern = "squat" | "hinge" | "push" | "pull" | "core" | "cardio";

interface Movement {
  name: string;
  note: string | null;
}

/**
 * Пул движений по оборудованию.
 *
 * По два-три варианта на паттерн: программа берёт первый, а остальные существуют
 * для замены при генерации разных дней, чтобы «День A» и «День B» не оказались
 * одинаковыми.
 */
const MOVEMENTS: Record<ProgramEquipment, Record<Pattern, Movement[]>> = {
  gym: {
    squat: [
      { name: "Приседания со штангой", note: "Спина прямая, колени по направлению стоп" },
      { name: "Жим ногами", note: null },
      { name: "Выпады с гантелями", note: null },
    ],
    hinge: [
      { name: "Румынская тяга", note: "Таз назад, спина не круглится" },
      { name: "Становая тяга", note: "Начинать с малого веса, техника важнее" },
      { name: "Гиперэкстензия", note: null },
    ],
    push: [
      { name: "Жим лёжа", note: "Лопатки сведены, штанга по линии низа груди" },
      { name: "Жим стоя", note: null },
      { name: "Жим гантелей под углом", note: null },
    ],
    pull: [
      { name: "Тяга верхнего блока", note: null },
      { name: "Тяга штанги в наклоне", note: null },
      { name: "Подтягивания", note: "С резинкой, если пока не выходит" },
    ],
    core: [
      { name: "Планка", note: "Секунды вместо повторений" },
      { name: "Подъём ног в висе", note: null },
    ],
    cardio: [
      { name: "Дорожка или велотренажёр", note: "Минуты вместо повторений, темп разговорный" },
    ],
  },
  home: {
    squat: [
      { name: "Приседания с гантелями", note: null },
      { name: "Выпады с гантелями", note: null },
      { name: "Болгарские выпады", note: "Опорная нога впереди, колено не выходит за носок" },
    ],
    hinge: [
      { name: "Румынская тяга с гантелями", note: "Таз назад, спина прямая" },
      { name: "Мостик на одной ноге", note: null },
      { name: "Наклоны с гантелями", note: null },
    ],
    push: [
      { name: "Отжимания", note: "Корпус прямой, локти под 45°" },
      { name: "Жим гантелей вверх", note: null },
      { name: "Отжимания с возвышения", note: "Проще, если обычные пока тяжело" },
    ],
    pull: [
      { name: "Подтягивания на турнике", note: "С резинкой, если пока не выходит" },
      { name: "Тяга гантели в наклоне", note: null },
      { name: "Тяга резинки к поясу", note: null },
    ],
    core: [
      { name: "Планка", note: "Секунды вместо повторений" },
      { name: "Подъём ног лежа", note: null },
    ],
    cardio: [{ name: "Быстрая ходьба или скакалка", note: "Минуты вместо повторений" }],
  },
  bodyweight: {
    squat: [
      { name: "Приседания", note: "Пятки на полу, спина прямая" },
      { name: "Выпады", note: null },
      { name: "Приседания на одной ноге у опоры", note: null },
    ],
    hinge: [
      { name: "Мостик на одной ноге", note: null },
      { name: "Подъём таза лёжа", note: null },
      { name: "Наклоны на одной ноге", note: "Держись за стену для равновесия" },
    ],
    push: [
      { name: "Отжимания", note: "Корпус прямой, локти под 45°" },
      { name: "Отжимания с возвышения", note: "Проще, если обычные пока тяжело" },
      { name: "Отжимания домиком", note: "Нагрузка смещается на плечи" },
    ],
    pull: [
      { name: "Подтягивания", note: "На турнике или в дверном проёме с резинкой" },
      { name: "Австралийские подтягивания", note: "Под столом или на низкой перекладине" },
      { name: "Обратные отжимания от опоры", note: null },
    ],
    core: [
      { name: "Планка", note: "Секунды вместо повторений" },
      { name: "Скручивания", note: null },
    ],
    cardio: [{ name: "Быстрая ходьба", note: "Минуты вместо повторений" }],
  },
};

/** Схема подходов по цели: подходы × повторы, отдых в секундах. */
const SCHEME: Record<ProgramGoal, { sets: number; reps: number; rest: number }> = {
  // Объёмная работа: на дефиците она переносится лучше и сохраняет мышцы.
  lose: { sets: 3, reps: 12, rest: 60 },
  // Силовая работа: меньше повторов, больше отдыха — то, от чего растут мышцы.
  gain: { sets: 4, reps: 8, rest: 120 },
  fit: { sets: 3, reps: 10, rest: 90 },
};

/**
 * Структура недели.
 *
 * Новичку — всё тело в каждый день: так каждое движение повторяется два-три раза
 * в неделю, а это главный фактор освоения техники. Опытному — верх/низ, потому
 * что при большем объёме на одну тренировку восстановление требует разделения.
 *
 * Дни через день (0 = Пн, 2 = Ср, 4 = Пт), потому что силовым на одну группу
 * мышц нужно 48 часов. Для похудения добавляется кардио-день в субботу: он не
 * требует восстановления и потому не конфликтует с силовыми.
 */
function weekStructure(
  goal: ProgramGoal,
  level: ProgramLevel,
): { title: string; weekday: number; patterns: Pattern[]; category: "strength" | "cardio" }[] {
  if (level === "beginner") {
    const days = [
      { title: "День A · всё тело", weekday: 0, patterns: ["squat", "push", "pull", "core"] as Pattern[], category: "strength" as const },
      { title: "День B · всё тело", weekday: 2, patterns: ["hinge", "push", "pull", "core"] as Pattern[], category: "strength" as const },
      { title: "День C · всё тело", weekday: 4, patterns: ["squat", "hinge", "push", "pull"] as Pattern[], category: "strength" as const },
    ];

    return goal === "lose"
      ? [...days, { title: "Кардио", weekday: 5, patterns: ["cardio"] as Pattern[], category: "cardio" as const }]
      : days;
  }

  const days = [
    { title: "Низ тела", weekday: 0, patterns: ["squat", "hinge", "core"] as Pattern[], category: "strength" as const },
    { title: "Верх тела", weekday: 1, patterns: ["push", "pull", "core"] as Pattern[], category: "strength" as const },
    { title: "Низ тела · вариант B", weekday: 3, patterns: ["hinge", "squat", "core"] as Pattern[], category: "strength" as const },
    { title: "Верх тела · вариант B", weekday: 4, patterns: ["pull", "push", "core"] as Pattern[], category: "strength" as const },
  ];

  return goal === "lose"
    ? [...days, { title: "Кардио", weekday: 5, patterns: ["cardio"] as Pattern[], category: "cardio" as const }]
    : days;
}

/**
 * Движение под паттерн, разное в разные дни.
 *
 * Индекс дня выбирает вариант из пула по кругу: так «День A» и «День B» не
 * оказываются одинаковым списком, а на четырёхдневной программе вариант B
 * действительно отличается от A.
 */
function movementFor(
  equipment: ProgramEquipment,
  pattern: Pattern,
  dayIndex: number,
): Movement {
  const pool = MOVEMENTS[equipment][pattern];
  return pool[dayIndex % pool.length];
}

export interface ProgramRequest {
  goal: ProgramGoal;
  level: ProgramLevel;
  equipment: ProgramEquipment;
}

export function buildTemplateProgram(request: ProgramRequest): ProgramPlan {
  const { goal, level, equipment } = request;
  const scheme = SCHEME[goal];
  const structure = weekStructure(goal, level);

  const days = structure.map((day, dayIndex) => ({
    title: day.title,
    category: day.category,
    weekday: day.weekday,
    exercises: day.patterns.map((pattern) => {
      const movement = movementFor(equipment, pattern, dayIndex);

      // Кардио и планка измеряются временем, а не повторениями: подставлять им
      // «12 повторений» значило бы записать бессмыслицу в план.
      const isTimed = pattern === "cardio" || movement.name === "Планка";

      return {
        name: movement.name,
        targetSets: isTimed ? 1 : scheme.sets,
        targetReps: pattern === "cardio" ? 25 : movement.name === "Планка" ? 45 : scheme.reps,
        restSeconds: isTimed ? 0 : scheme.rest,
        note: movement.note,
      };
    }),
  }));

  const strengthDays = structure.filter((day) => day.category === "strength").length;

  return {
    name: `${PROGRAM_GOAL_LABELS[goal]} · ${PROGRAM_EQUIPMENT_LABELS[equipment].toLowerCase()} · ${days.length} дн.`,
    summary:
      level === "beginner"
        ? `${strengthDays} силовые тренировки на всё тело через день: так каждое движение повторяется дважды в неделю, а это главное для освоения техники. Схема ${scheme.sets}×${scheme.reps}, отдых ${scheme.rest} с.`
        : `Верх и низ по два раза в неделю — при таком объёме разделение нужно для восстановления. Схема ${scheme.sets}×${scheme.reps}, отдых ${scheme.rest} с.`,
    days,
  };
}
