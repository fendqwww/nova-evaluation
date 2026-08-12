"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, GraduationCap } from "lucide-react";
import { AsyncSection } from "@/shared/ui/async-section";
import { Card } from "@/shared/ui/card";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { useOpenIntent } from "@/shared/lib/use-add-intent";
import { useAcademy } from "@/features/academy/hooks/use-academy";
import { usePath } from "@/features/path/hooks/use-path";
import { curriculumToday } from "@/features/path/lib/curriculum";
import { PATH_GOAL_KIND_META } from "@/features/path/lib/goal-kinds";
import { academyProgress } from "@/features/academy/lib/progress";
import { AcademyTodayCard } from "@/features/academy/components/academy-today-card";
import { LessonReaderModal } from "@/features/academy/components/lesson-reader-modal";
import {
  ACADEMY_LESSONS,
  ACADEMY_TOPIC_LABELS,
  type AcademyLesson,
} from "@/features/academy/content/lessons";

/**
 * Академия — программа, а не библиотека статей.
 *
 * ПОРЯДОК ЭКРАНА. Сверху путь обучения под цель человека: один урок, одна
 * книга, одно действие на сегодня. Ниже — вся программа по темам.
 *
 * ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ. Экран открывался «сегодняшним уроком» — первым
 * непройденным из двадцати, одним и тем же для всех. Один урок наверху уже
 * решал главную проблему раздела (список из двадцати текстов не читают, потому
 * что выбор из двадцати вариантов сам по себе работа), но решал её вслепую:
 * человек, выбравший цель «похудеть», получал уроком дня «Правило двух минут»
 * просто потому, что оно стояло следующим по порядку. Академия жила отдельно от
 * цели, ради которой человек вообще открыл приложение.
 *
 * Теперь наверху цель и три вещи под неё (AcademyTodayCard), а полная программа
 * стоит под ними и остаётся доступной целиком — она конечна, и скрывать её
 * состав значило бы прятать от человека, куда он идёт. Изменился не объём, а
 * то, что читается первым.
 *
 * Прогресс показан числом и полосой дважды и в разных масштабах намеренно: под
 * целью — «2 из 4 уроков под цель», под заголовком «Вся программа» — «12 из 20
 * пройдено». Это ответы на два разных вопроса, и общий счётчик не должен
 * подменять собой прогресс той программы, которую человек проходит сейчас.
 */
export function AcademyView() {
  const { completedIds, isPending, isError, retry, setCompleted } = useAcademy();
  const [openLesson, setOpenLesson] = useState<AcademyLesson | null>(null);

  /**
   * Пришли по ссылке на конкретный урок — с экрана пути, из карточки «Что
   * изучить под эту цель» (`/academy?open=calorie-deficit`).
   *
   * Урок ищется в списке, а не берётся из адреса на веру: `?open=` приходит
   * снаружи и может содержать что угодно, включая id урока, удалённого в
   * прошлом релизе. Ненайденный id молча даёт обычный экран академии — это
   * честнее пустой модалки и не требует экрана ошибки для опечатки в ссылке.
   *
   * Значение выводится, а не заталкивается в состояние эффектом, и гасится
   * `intentDismissed`, чтобы закрытый урок не открывался снова.
   */
  const openIntent = useOpenIntent();
  const [intentDismissed, setIntentDismissed] = useState(false);
  const intentLesson =
    openIntent === null || intentDismissed
      ? null
      : (ACADEMY_LESSONS.find((lesson) => lesson.id === openIntent) ?? null);

  const visibleLesson = openLesson ?? intentLesson;

  /**
   * Цель из «Моего пути» — то, подо что собирается программа. Академия
   * рисуется и без неё: `snapshot` может быть null и пока грузится, и потому
   * что путь ещё не создан, и оба случая дают один и тот же честный экран с
   * общей программой. Поэтому здесь нет ни ожидания, ни скелета — цель
   * уточняет карточку, но не является условием её показа.
   */
  const { snapshot: pathSnapshot } = usePath();
  const goalKind = pathSnapshot?.path?.goalKind ?? null;

  const progress = useMemo(() => academyProgress(completedIds), [completedIds]);
  const done = useMemo(() => new Set(completedIds), [completedIds]);
  const today = useMemo(
    () => (goalKind === null ? null : curriculumToday(goalKind, completedIds)),
    [goalKind, completedIds],
  );

  function open(lesson: AcademyLesson) {
    haptics.tap();
    setOpenLesson(lesson);
  }

  return (
    <PageContainer className="flex flex-col gap-5">
      <PageHeader
        title="Академия"
        subtitle="Короткие уроки о том, как это работает"
      />

      <AsyncSection
        isPending={isPending}
        isError={isError}
        skeleton={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        }
        onRetry={retry}
        icon={<GraduationCap className="h-5 w-5" />}
        errorTitle="Академия не загрузилась"
      >
        <Reveal className="gap-5">
          {/* Цель, один урок, одна книга, одно действие. */}
          <RevealItem>
            <AcademyTodayCard
              goalTitle={goalKind === null ? null : PATH_GOAL_KIND_META[goalKind].label}
              today={today}
              fallbackLesson={progress.todayLesson}
              onOpenLesson={open}
            />
          </RevealItem>

          {/* Вся программа — под путём обучения, а не вместо него.
              Список из двадцати уроков остаётся доступным целиком: программа
              конечна, и скрывать её состав значило бы прятать от человека,
              куда он идёт. Но он больше не первое, что видно на экране, и
              поэтому перестал быть выбором, который надо сделать до того, как
              что-либо прочитать. Заголовок с общим счётчиком — граница между
              «что делать сегодня» и «что вообще есть». */}
          <RevealItem className="flex flex-col gap-1 pt-1">
            <p className="text-section text-muted-foreground">Вся программа</p>
            <p className="numeric text-caption text-subtle-foreground">
              {progress.done} из {progress.total} уроков пройдено
            </p>
          </RevealItem>

          {/* Пять тем — одной карточкой с подзаголовками, а не пятью
              карточками подряд. Пять одинаковых прямоугольников со списками
              внутри читаются как каталог, ровно то, чем этот экран перестал
              быть наверху; одна поверхность с разделами внутри читается как
              оглавление одной программы, чем она и является. Ни один урок и ни
              один счётчик темы при этом не исчез. */}
          <RevealItem>
            <Card>
              <div className="flex flex-col">
                {progress.byTopic.map((topic, topicIndex) => (
                  <div key={topic.topic} className="flex flex-col">
                    <div
                      className="flex items-baseline justify-between gap-2 px-4 pb-1.5 pt-3.5"
                      // Линия во всю ширину отделяет тему от предыдущей — это
                      // граница между разделами, а не между строками.
                      style={
                        topicIndex === 0
                          ? undefined
                          : { boxShadow: "inset 0 1px 0 0 var(--border)" }
                      }
                    >
                      <p className="text-section text-muted-foreground">
                        {ACADEMY_TOPIC_LABELS[topic.topic]}
                      </p>
                      <span className="numeric text-caption text-subtle-foreground">
                        {topic.done}/{topic.total}
                      </span>
                    </div>

                    {ACADEMY_LESSONS.filter((lesson) => lesson.topic === topic.topic).map(
                      (lesson, index, list) => {
                        const isDone = done.has(lesson.id);

                        return (
                          <motion.button
                            key={lesson.id}
                            type="button"
                            onClick={() => open(lesson)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              delay: topicIndex * 0.04 + index * 0.02,
                              duration: 0.3,
                            }}
                            className="press-sm flex items-center gap-3 px-4 py-3.5 text-left active:bg-fill-subtle"
                            style={
                              index === list.length - 1
                                ? undefined
                                : { boxShadow: "inset 0 -1px 0 0 var(--border)" }
                            }
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
                                isDone
                                  ? "border-accent bg-accent text-accent-foreground"
                                  : "border-border-strong bg-transparent",
                              )}
                            >
                              {isDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>

                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span
                                className={cn(
                                  "text-body font-medium",
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
                          </motion.button>
                        );
                      },
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </RevealItem>
        </Reveal>
      </AsyncSection>

      <LessonReaderModal
        lesson={visibleLesson}
        isCompleted={visibleLesson !== null && done.has(visibleLesson.id)}
        open={visibleLesson !== null}
        onOpenChange={(next) => {
          if (!next) {
            setOpenLesson(null);
            setIntentDismissed(true);
          }
        }}
        onToggleCompleted={setCompleted}
      />
    </PageContainer>
  );
}
