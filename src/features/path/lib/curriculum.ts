/**
 * Программа обучения под цель — то, что превращает путь в сценарий.
 *
 * ЗАЧЕМ ЭТО СУЩЕСТВУЕТ. В продукте уже было три части одного ответа, и они не
 * знали друг о друге. Путь давал план действий («сбросить вес» → этапы и шаги),
 * академия давала двадцать уроков, библиотека — пятнадцать книг. Человек,
 * выбравший цель «похудеть», получал маршрут и два раздела, в которых надо
 * самому догадаться, что из двадцати уроков и пятнадцати книг относится к нему.
 * То есть ровно та работа по выбору, ради избавления от которой человек и
 * выбирал готовую цель.
 *
 * Здесь эта связь названа явно: цель → её уроки → её книги. Ничего нового не
 * придумывается, только соединяется уже написанное.
 *
 * ПОЧЕМУ ТАБЛИЦА В КОДЕ, А НЕ ПОДБОР МОДЕЛЬЮ. Это редакторское решение того же
 * рода, что состав библиотеки: оно одинаково для всех, меняется вместе с
 * релизом и должно быть одинаковым при каждом открытии. Спрашивать Gemini,
 * какие книги подходят к похудению, значит тратить лимит тарифа на вопрос с
 * заранее известным ответом и получать сегодня один список, завтра другой.
 *
 * ПОЧЕМУ ИМЕННО СТОЛЬКО. По три-четыре урока и по две-три книги на цель.
 * Полный список уроков темы — это снова каталог; один урок — это не программа.
 * Три-четыре складываются в понятную последовательность, которую видно
 * целиком.
 *
 * ЧЕСТНОСТЬ СВЯЗЕЙ. Каждый id ниже проверяется на существование при сборке
 * подборки (resolveCurriculum отбрасывает то, чего нет), поэтому опечатка или
 * удалённый урок дают на экране на строку меньше, а не пустую карточку и не
 * ссылку в никуда.
 */

import { ACADEMY_LESSONS, type AcademyLesson } from "@/features/academy/content/lessons";
import { LIBRARY_BOOKS, type LibraryBook } from "@/features/library/content/books";
import type { PathGoalKind } from "@/features/path/lib/goal-kinds";

interface CurriculumEntry {
  /** Уроки академии в том порядке, в котором их стоит прочитать. */
  lessonIds: readonly string[];
  /** Книги библиотеки — от самой прикладной к самой общей. */
  bookIds: readonly string[];
}

/**
 * Семь целей — те же семь, что в PATH_GOAL_KINDS. Record без опционального
 * ключа: новая цель не соберётся, пока ей не назначили программу, и это
 * единственный способ не получить цель, которая молча ничему не учит.
 */
const CURRICULUM: Record<PathGoalKind, CurriculumEntry> = {
  // Дефицит, белок, колебания веса и связь сна с аппетитом — четыре вопроса,
  // на которых спотыкается похудение, ровно в этом порядке.
  lose_weight: {
    lessonIds: ["calorie-deficit", "protein-basics", "weight-fluctuation", "sleep-and-appetite"],
    bookIds: ["why-we-eat-too-much", "diet-myth", "atomic-habits"],
  },
  // Набор массы — это прогрессия и восстановление, а не количество подходов.
  gain_muscle: {
    lessonIds: ["progression", "protein-basics", "how-many-sessions", "recovery"],
    bookIds: ["starting-strength", "bigger-leaner-stronger"],
  },
  get_fit: {
    lessonIds: ["how-many-sessions", "strength-for-fatloss", "progression", "recovery"],
    bookIds: ["bigger-leaner-stronger", "endure"],
  },
  nutrition: {
    lessonIds: ["calorie-deficit", "protein-basics", "water-and-hunger"],
    bookIds: ["diet-myth", "why-we-eat-too-much", "salt-fat-acid-heat"],
  },
  sleep: {
    lessonIds: ["personal-sleep-norm", "wake-time-anchor", "light-and-sleep", "sleep-and-appetite"],
    bookIds: ["why-we-sleep", "circadian-code"],
  },
  // Продуктивность начинается со сна, а не с планировщика: невыспавшийся
  // человек не становится дисциплинированным от списка задач. Дальше —
  // привычки и дисциплина, то есть «одна цель» и «шаги вместо намерения».
  productivity: {
    lessonIds: ["personal-sleep-norm", "habit-beats-motivation", "one-goal", "goal-needs-steps"],
    bookIds: ["deep-work", "getting-things-done", "atomic-habits"],
  },
  growth: {
    lessonIds: ["habit-beats-motivation", "two-minute-rule", "after-a-miss", "invisible-progress"],
    bookIds: ["atomic-habits", "mindset", "power-of-habit"],
  },
};

export interface PathCurriculum {
  lessons: AcademyLesson[];
  books: LibraryBook[];
}

export interface CurriculumToday {
  /** Следующий непрочитанный урок под цель. Null — программа цели пройдена. */
  lesson: AcademyLesson | null;
  /** Книга текущего отрезка программы. Null — под цель книг нет. */
  book: LibraryBook | null;
  done: number;
  total: number;
  /** 0–1 по программе цели, а не по всей академии. */
  ratio: number;
  isComplete: boolean;
}

/**
 * Один урок, одна книга и один прогресс — то, из чего собран экран академии.
 *
 * ПОЧЕМУ КНИГА ПРИВЯЗАНА К ПРОГРЕССУ, А НЕ ВЗЯТА ПЕРВОЙ. Уроки под цель делятся
 * поровну между её книгами, и книга меняется, когда человек переходит на
 * следующий отрезок. Иначе «одна книга на сегодня» была бы одной и той же
 * книгой все три месяца пути — то есть не рекомендацией, а украшением заголовка.
 * Деление грубое и намеренно такое: книга читается неделями, и притворяться, что
 * продукт знает, на какой странице человек находится, было бы враньём.
 *
 * Когда программа цели пройдена, `lesson` равен null, а книга остаётся
 * последней: перечитать её осмысленно, а вот «сегодняшнего урока» больше нет, и
 * подставлять на это место первый попавшийся значило бы гонять человека по
 * кругу.
 */
export function curriculumToday(
  goalKind: PathGoalKind,
  completedLessonIds: readonly string[],
): CurriculumToday {
  const { lessons, books } = resolveCurriculum(goalKind);
  const done = new Set(completedLessonIds);
  const doneCount = lessons.filter((lesson) => done.has(lesson.id)).length;

  const lesson = lessons.find((item) => !done.has(item.id)) ?? null;

  // Отрезок программы, на котором человек стоит сейчас. Индекс считается от
  // числа пройденных уроков и прижимается к последней книге, чтобы на
  // завершённой программе не выйти за границы массива.
  const perBook = books.length === 0 ? 0 : Math.ceil(lessons.length / books.length);
  const bookIndex = perBook === 0 ? 0 : Math.min(books.length - 1, Math.floor(doneCount / perBook));
  const book = books.length === 0 ? null : books[bookIndex];

  return {
    lesson,
    book,
    done: doneCount,
    total: lessons.length,
    ratio: lessons.length === 0 ? 0 : doneCount / lessons.length,
    isComplete: lessons.length > 0 && doneCount === lessons.length,
  };
}

/**
 * Уроки и книги под цель, уже развёрнутые в объекты и отфильтрованные от
 * несуществующих id. Порядок сохраняется — он и есть последовательность.
 */
export function resolveCurriculum(goalKind: PathGoalKind): PathCurriculum {
  const entry = CURRICULUM[goalKind];

  const lessons = entry.lessonIds
    .map((id) => ACADEMY_LESSONS.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is AcademyLesson => lesson !== undefined);

  const books = entry.bookIds
    .map((id) => LIBRARY_BOOKS.find((book) => book.id === id))
    .filter((book): book is LibraryBook => book !== undefined);

  return { lessons, books };
}
