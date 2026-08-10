import type { LibraryBook } from "@/features/library/content/books";
import type { LibraryProblem } from "@/features/library/lib/problems";

/**
 * Одна рекомендация: диагноз, книга и связь между ними.
 *
 * `reason` — не аннотация книги, а объяснение, почему она отвечает именно на эту
 * проблему. Разница видна на примере: аннотация «Атомных привычек» одинакова для
 * всех, а причина «поможет построить систему вместо рывков — у тебя привычки
 * выполняются на 43%» существует только для этого человека.
 */
export interface LibraryRecommendation {
  problem: LibraryProblem;
  book: LibraryBook;
  reason: string;
}

/** Экран «Библиотека» одним запросом. */
export interface LibrarySnapshot {
  /**
   * Персональные рекомендации, от важной к менее важной. Пустой массив —
   * данных пока не хватает или всё в порядке, и это честное состояние.
   */
  recommendations: LibraryRecommendation[];
  /** Полный каталог. Один и тот же для всех — см. content/books.ts. */
  books: LibraryBook[];
}
