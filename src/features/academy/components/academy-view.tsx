"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, GraduationCap, Play } from "lucide-react";
import { AsyncSection } from "@/shared/ui/async-section";
import { Button } from "@/shared/ui/button";
import { Card, IconChip } from "@/shared/ui/card";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Progress } from "@/shared/ui/progress";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { useAcademy } from "@/features/academy/hooks/use-academy";
import { academyProgress } from "@/features/academy/lib/progress";
import { LessonReaderModal } from "@/features/academy/components/lesson-reader-modal";
import {
  ACADEMY_LESSONS,
  ACADEMY_TOPIC_LABELS,
  type AcademyLesson,
} from "@/features/academy/content/lessons";

/**
 * Академия — программа, а не библиотека статей.
 *
 * ПОРЯДОК ЭКРАНА. Сверху один урок на сегодня и общий прогресс, ниже — темы со
 * своими уроками. Один урок наверху решает главную проблему такого раздела:
 * список из двадцати текстов не читают, потому что выбор из двадцати вариантов
 * сам по себе является работой. Пять минут и одно действие — это предложение, на
 * которое можно ответить «да» не задумываясь.
 *
 * Прогресс показан числом и полосой, потому что обучение — единственное место в
 * приложении, где счётчик «12 из 20» уместен: программа конечна, и её видимый
 * конец сам по себе является причиной продолжать.
 */
export function AcademyView() {
  const { completedIds, isPending, isError, retry, setCompleted } = useAcademy();
  const [openLesson, setOpenLesson] = useState<AcademyLesson | null>(null);

  const progress = useMemo(() => academyProgress(completedIds), [completedIds]);
  const done = useMemo(() => new Set(completedIds), [completedIds]);

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
          {/* Урок дня — или поздравление, когда программа пройдена целиком. */}
          <RevealItem>
            <Card elevation="lifted">
              <div className="flex flex-col gap-4 p-4">
                <div className="flex items-start gap-3">
                  <IconChip tone="ai" size="lg">
                    <GraduationCap className="h-5 w-5" />
                  </IconChip>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-label uppercase text-muted-foreground">
                      {progress.isComplete ? "Программа пройдена" : "Сегодняшний урок"}
                    </p>
                    <p className="text-title text-foreground">
                      {progress.todayLesson?.title ?? "Все уроки закрыты"}
                    </p>
                    <p className="text-caption leading-snug text-muted-foreground">
                      {progress.todayLesson
                        ? `${progress.todayLesson.hook} · ${progress.todayLesson.minutes} мин`
                        : "Возвращайся к любому уроку, когда понадобится освежить."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-caption text-muted-foreground">Прогресс</span>
                    <span className="numeric text-caption font-medium text-foreground">
                      {progress.done} из {progress.total} уроков
                    </span>
                  </div>
                  <Progress value={progress.ratio} size="lg" label="Прогресс академии" />
                </div>

                {progress.todayLesson && (
                  <Button
                    size="lg"
                    className="w-full font-semibold"
                    onClick={() => open(progress.todayLesson as AcademyLesson)}
                  >
                    <Play className="h-4 w-4" />
                    Читать · {progress.todayLesson.minutes} мин
                  </Button>
                )}
              </div>
            </Card>
          </RevealItem>

          {/* Темы. Все уроки видны сразу: программа конечна, и скрывать её
              состав значило бы прятать от человека, куда он идёт. */}
          {progress.byTopic.map((topic, topicIndex) => (
            <RevealItem key={topic.topic} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-section text-muted-foreground">
                  {ACADEMY_TOPIC_LABELS[topic.topic]}
                </p>
                <span className="numeric text-caption text-subtle-foreground">
                  {topic.done}/{topic.total}
                </span>
              </div>

              <Card>
                <div className="flex flex-col">
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
              </Card>
            </RevealItem>
          ))}
        </Reveal>
      </AsyncSection>

      <LessonReaderModal
        lesson={openLesson}
        isCompleted={openLesson !== null && done.has(openLesson.id)}
        open={openLesson !== null}
        onOpenChange={(next) => !next && setOpenLesson(null)}
        onToggleCompleted={setCompleted}
      />
    </PageContainer>
  );
}
