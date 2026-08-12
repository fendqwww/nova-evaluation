"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, GraduationCap, Play, Target, Zap } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";
import { haptics } from "@/shared/lib/haptics";
import { TARGET_HREF } from "@/features/academy/lib/target-href";
import type { AcademyLesson } from "@/features/academy/content/lessons";
import type { CurriculumToday } from "@/features/path/lib/curriculum";

/**
 * «Твой путь обучения» — то, чем академия открывается вместо оглавления.
 *
 * ЧТО ЭТО ЗАМЕНИЛО. Экран открывался карточкой «Сегодняшний урок» — первым
 * непройденным уроком из двадцати, одинаковым для всех. Это честно, но это
 * программа вообще, а не программа этого человека: тот, кто пришёл худеть,
 * получал уроком дня «Правило двух минут», потому что оно стояло следующим по
 * списку. Обучение существовало отдельно от цели, ради которой человек вообще
 * открыл приложение.
 *
 * Теперь наверху стоит цель, а под ней ровно три вещи на сегодня: один урок,
 * одна книга, одно действие. Три — потому что это то, что помещается в один
 * день и в одно решение; двадцать уроков списком — это работа по выбору,
 * которую человек проделывать не станет.
 *
 * ДЕЙСТВИЕ — САМАЯ ВАЖНАЯ ИЗ ТРЁХ СТРОК. Урок без действия это статья, и
 * `takeaway` у каждого урока существует именно затем, чтобы после чтения
 * осталось что сделать. Где у урока есть адрес в приложении, строка становится
 * ссылкой в тот раздел; где нет — остаётся текстом, а не притворяется кнопкой.
 *
 * БЕЗ ЦЕЛИ КАРТОЧКА НЕ ЛОМАЕТСЯ. Пока пути нет, показывается прежний урок дня и
 * приглашение выбрать цель — экран остаётся полезным, но честно говорит, чего в
 * нём не хватает, вместо того чтобы выдумывать персонализацию.
 */
export function AcademyTodayCard({
  goalTitle,
  today,
  fallbackLesson,
  onOpenLesson,
}: {
  /** Название цели из пути, либо null — путь ещё не создан. */
  goalTitle: string | null;
  /** Программа под цель. Null, когда цели нет. */
  today: CurriculumToday | null;
  /** Урок дня из общей программы — то, что показывается без цели. */
  fallbackLesson: AcademyLesson | null;
  onOpenLesson: (lesson: AcademyLesson) => void;
}) {
  const lesson = today ? today.lesson : fallbackLesson;
  const book = today?.book ?? null;
  const actionHref = lesson?.target ? TARGET_HREF[lesson.target] : null;

  return (
    <Card elevation="lifted">
      <div className="flex flex-col gap-5 p-4">
        {/* Цель и прогресс по её программе. Без цели — назначение раздела
            одной строкой, чтобы шапка не пустовала. */}
        <div className="flex items-start gap-3">
          <IconChip tone={goalTitle ? "accent" : "ai"} size="lg">
            {goalTitle ? <Target className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
          </IconChip>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-label uppercase text-muted-foreground">Твой путь обучения</p>
            <p className="text-title text-foreground">
              {goalTitle ?? "Программа Nova"}
            </p>
            <p className="text-caption text-muted-foreground">
              {today
                ? `${today.done} из ${today.total} уроков под цель`
                : "Выбери цель — и программа соберётся под неё"}
            </p>
          </div>
        </div>

        {today && today.total > 0 && (
          <Progress value={today.ratio} size="lg" label="Прогресс программы под цель" />
        )}

        {/* СЕГОДНЯ: урок, книга, действие. */}
        <div className="flex flex-col gap-2">
          <p className="text-label uppercase text-subtle-foreground">Сегодня</p>

          {lesson ? (
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                onOpenLesson(lesson);
              }}
              className="press-sm flex items-start gap-3 rounded-xl border border-border bg-fill-subtle p-3 text-left active:border-border-strong"
            >
              <IconChip tone="ai" size="sm">
                <GraduationCap className="h-3.5 w-3.5" />
              </IconChip>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-micro uppercase tracking-[0.05em] text-subtle-foreground">
                  Урок · {lesson.minutes} мин
                </span>
                <span className="text-body font-medium text-foreground">{lesson.title}</span>
                <span className="line-clamp-2 text-caption leading-snug text-muted-foreground">
                  {lesson.hook}
                </span>
              </span>
            </button>
          ) : (
            <div className="rounded-xl border border-border bg-fill-subtle p-3">
              <p className="text-caption leading-snug text-muted-foreground">
                Все уроки под эту цель пройдены. Возвращайся к любому из них ниже, когда
                понадобится освежить.
              </p>
            </div>
          )}

          {book && (
            <Link
              href={`/library?open=${book.id}`}
              onClick={() => haptics.tap()}
              className="press-sm flex items-start gap-3 rounded-xl border border-border bg-fill-subtle p-3 active:border-border-strong"
            >
              <IconChip tone="goal" size="sm">
                <BookOpen className="h-3.5 w-3.5" />
              </IconChip>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-micro uppercase tracking-[0.05em] text-subtle-foreground">
                  Книга · {book.hours} ч
                </span>
                <span className="text-body font-medium text-foreground">{book.title}</span>
                <span className="line-clamp-1 text-caption text-muted-foreground">
                  {book.author}
                </span>
              </span>
            </Link>
          )}

          {lesson &&
            (actionHref ? (
              <Link
                href={actionHref}
                onClick={() => haptics.tap()}
                className="press-sm group flex items-start gap-3 rounded-xl border border-accent-border bg-accent-soft p-3 active:bg-accent-muted"
              >
                <IconChip tone="accent" size="sm">
                  <Zap className="h-3.5 w-3.5" />
                </IconChip>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-micro uppercase tracking-[0.05em] text-accent">
                    Действие
                  </span>
                  <span className="text-caption leading-snug text-foreground">
                    {lesson.takeaway}
                  </span>
                </span>
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-active:translate-x-0.5" />
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-fill-subtle p-3">
                <IconChip tone="accent" size="sm">
                  <Zap className="h-3.5 w-3.5" />
                </IconChip>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-micro uppercase tracking-[0.05em] text-subtle-foreground">
                    Действие
                  </span>
                  <span className="text-caption leading-snug text-foreground">
                    {lesson.takeaway}
                  </span>
                </span>
              </div>
            ))}
        </div>

        {/* Одно главное действие экрана. Без цели оно ведёт создавать путь —
            это и есть следующий шаг для того, у кого программы ещё нет. */}
        {lesson ? (
          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={() => {
              haptics.tap();
              onOpenLesson(lesson);
            }}
          >
            <Play className="h-4 w-4" />
            Читать урок · {lesson.minutes} мин
          </Button>
        ) : (
          !goalTitle && (
            <Button asChild size="lg" className="w-full font-semibold">
              <Link href="/path?add=1" onClick={() => haptics.tap()}>
                Выбрать цель
              </Link>
            </Button>
          )
        )}

        {!goalTitle && lesson && (
          <Link
            href="/path?add=1"
            onClick={() => haptics.tap()}
            className="press-sm -m-1 text-center text-caption text-muted-foreground active:text-foreground"
          >
            Выбрать цель, чтобы программа собралась под неё
          </Link>
        )}
      </div>
    </Card>
  );
}
