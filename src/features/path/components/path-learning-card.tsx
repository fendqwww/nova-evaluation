"use client";

import Link from "next/link";
import { BookOpen, Check, GraduationCap } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { resolveCurriculum } from "@/features/path/lib/curriculum";
import type { PathGoalKind } from "@/features/path/lib/goal-kinds";

/**
 * «Что изучить под эту цель» — третья часть сценария.
 *
 * План отвечает, что делать. Эта карточка отвечает, почему это работает, и она
 * стоит именно на экране пути, потому что цель выбрана здесь. Без неё академия
 * и библиотека остаются двумя каталогами, в которых человек с целью «похудеть»
 * ищет своё среди чужого.
 *
 * КАЖДАЯ СТРОКА ОТКРЫВАЕТ РОВНО ТО, ЧТО НАЗЫВАЕТ. Ссылка несёт `?open=<id>`,
 * и принимающий экран разворачивает нужный урок или книгу на монтировании (см.
 * useOpenIntent). Список названий, ведущий в оглавление раздела, был бы обещанием
 * с лишним шагом: человек прочитал бы «Дефицит калорий», нажал и снова оказался
 * перед выбором из двадцати уроков.
 *
 * ПРОЧИТАННЫЕ УРОКИ ОСТАЮТСЯ В СПИСКЕ, а не исчезают из него — с галочкой.
 * Программа под цель это последовательность, и последовательность, из которой
 * пропадают пройденные пункты, перестаёт быть видимой целиком: пропадает как
 * ощущение продвижения, так и возможность вернуться и перечитать.
 */
export function PathLearningCard({
  goalKind,
  completedLessonIds,
}: {
  goalKind: PathGoalKind;
  /**
   * Уроки, уже закрытые в академии. Пустой массив — пока не загрузилось или
   * ничего не пройдено; разницы для этой карточки нет, оба случая рисуются
   * одинаково.
   */
  completedLessonIds: readonly string[];
}) {
  const { lessons, books } = resolveCurriculum(goalKind);
  const done = new Set(completedLessonIds);

  if (lessons.length === 0 && books.length === 0) return null;

  const doneCount = lessons.filter((lesson) => done.has(lesson.id)).length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-section text-muted-foreground">Что изучить под эту цель</p>
        {lessons.length > 0 && (
          <span className="numeric text-caption text-subtle-foreground">
            {doneCount} из {lessons.length}
          </span>
        )}
      </div>

      <Card>
        <div className="flex flex-col">
          {lessons.map((lesson, index) => {
            const isDone = done.has(lesson.id);
            // Разделитель не рисуется под последней строкой карточки. Ею может
            // оказаться последний урок — когда книг под цель нет вовсе.
            const isLastRow = books.length === 0 && index === lessons.length - 1;

            return (
              <Link
                key={lesson.id}
                href={`/academy?open=${lesson.id}`}
                onClick={() => haptics.tap()}
                className="press-sm flex items-center gap-3 px-3.5 py-3 active:bg-fill-subtle"
                style={isLastRow ? undefined : { boxShadow: "inset 0 -1px 0 0 var(--border)" }}
              >
                <IconChip tone="ai" size="sm">
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <GraduationCap className="h-3.5 w-3.5" />
                  )}
                </IconChip>

                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "truncate text-body font-medium",
                      isDone ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {lesson.title}
                  </span>
                  <span className="line-clamp-1 text-caption text-subtle-foreground">
                    {lesson.hook}
                  </span>
                </span>

                <span className="numeric shrink-0 text-caption text-subtle-foreground">
                  {lesson.minutes} мин
                </span>
              </Link>
            );
          })}

          {books.map((book, index) => (
            <Link
              key={book.id}
              href={`/library?open=${book.id}`}
              onClick={() => haptics.tap()}
              className="press-sm flex items-center gap-3 px-3.5 py-3 active:bg-fill-subtle"
              // Последняя строка карточки не носит разделителя — иначе список
              // выглядит оборванным на нижней границе.
              style={
                index === books.length - 1
                  ? undefined
                  : { boxShadow: "inset 0 -1px 0 0 var(--border)" }
              }
            >
              <IconChip tone="goal" size="sm">
                <BookOpen className="h-3.5 w-3.5" />
              </IconChip>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-medium text-foreground">
                  {book.title}
                </span>
                <span className="line-clamp-1 text-caption text-subtle-foreground">
                  {book.author}
                </span>
              </span>

              <span className="numeric shrink-0 text-caption text-subtle-foreground">
                {book.hours} ч
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
