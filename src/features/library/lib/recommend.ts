/**
 * Из диагноза — в книгу.
 *
 * Правило одно: каждая проблема получает одну книгу, и книга не повторяется.
 * Причина в том, что рекомендация из трёх книг на одну проблему — это опять
 * список, из которого надо выбирать, то есть возврат к тому, от чего этот раздел
 * избавляет.
 *
 * Больше трёх рекомендаций не показывается никогда: человек, у которого нашлось
 * шесть проблем, получит шесть поводов не начинать.
 */

import {
  LIBRARY_BOOKS,
  type LibraryBook,
  type LibraryProblemId,
} from "@/features/library/content/books";
import type { LibraryProblem } from "@/features/library/lib/problems";
import type { LibraryRecommendation } from "@/features/library/types";

const MAX_RECOMMENDATIONS = 3;

/** Чем именно книга помогает против конкретной проблемы. */
const REASONS: Record<LibraryProblemId, string> = {
  quits_early:
    "Даёт систему вместо рывков: маленькое действие, которое невозможно не сделать, вместо большого решения по понедельникам.",
  no_system:
    "Учит выгружать дела из головы в систему, где у каждого есть следующее конкретное действие.",
  sleep_debt:
    "Объясняет, что именно недосып делает с гормонами голода и восстановлением — после этого сон перестаёт казаться местом, где можно сэкономить.",
  sleep_chaos:
    "Разбирает, как свет, еда и время подъёма задают внутренние часы: режим собирается из них, а не из силы воли.",
  diet_unknown:
    "Показывает, почему одинаковая еда по-разному действует на разных людей, и что из этого следует для твоего рациона.",
  overeating:
    "Объясняет вес через гормональную регуляцию, а не через слабость характера — и почему резкие диеты возвращают съеденное.",
  no_training:
    "Разбирает технику базовых движений и линейную прогрессию: с нуля это самый надёжный путь и самый короткий.",
  no_progression:
    "Даёт схему, как продолжать расти, когда первые лёгкие прибавки закончились.",
  no_focus:
    "Учит собирать день из блоков сосредоточенной работы вместо борьбы с прерываниями.",
  money:
    "Показывает, что результат в деньгах определяется поведением и терпением, а не расчётами, — тем же, чем и результат в здоровье.",
};

/** Первая подходящая книга, ещё не занятая другой проблемой. */
function pickBook(problemId: LibraryProblemId, used: Set<string>): LibraryBook | null {
  return (
    LIBRARY_BOOKS.find((book) => book.solves.includes(problemId) && !used.has(book.id)) ?? null
  );
}

export function recommendBooks(problems: LibraryProblem[]): LibraryRecommendation[] {
  const used = new Set<string>();
  const recommendations: LibraryRecommendation[] = [];

  for (const problem of problems) {
    if (recommendations.length >= MAX_RECOMMENDATIONS) break;

    const book = pickBook(problem.id, used);
    if (!book) continue;

    used.add(book.id);
    recommendations.push({ problem, book, reason: REASONS[problem.id] });
  }

  return recommendations;
}
