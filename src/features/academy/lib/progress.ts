/**
 * Что показывает Академия: сегодняшний урок и прогресс.
 *
 * ПОЧЕМУ «УРОК ДНЯ» ВЫБИРАЕТСЯ, А НЕ НАЗНАЧАЕТСЯ. Экран обещает один урок на
 * сегодня, и это обещание держится на простом правиле: первый непройденный по
 * порядку. Порядок в content/lessons.ts не случаен — внутри каждой темы уроки
 * идут от основы к следствию, а темы перемешаны так, чтобы человек не читал
 * четыре урока о питании подряд.
 *
 * Никакой персонализации выбора здесь нет намеренно. «Урок под твоё слабое
 * место» звучит лучше, но означает, что человек, у которого проблема со сном,
 * никогда не прочтёт про белок, а порядок обучения будет меняться от того, как
 * он спал вчера. Диагноз и рекомендация под состояние — работа библиотеки и
 * коуча; работа академии — провести через программу целиком.
 */

import {
  ACADEMY_LESSONS,
  ACADEMY_TOPICS,
  type AcademyLesson,
  type AcademyTopic,
} from "@/features/academy/content/lessons";

export interface AcademyTopicProgress {
  topic: AcademyTopic;
  total: number;
  done: number;
  /** 0–1. */
  ratio: number;
}

export interface AcademyProgressView {
  /** Первый непройденный урок — тот, что предлагается сегодня. Null — всё пройдено. */
  todayLesson: AcademyLesson | null;
  done: number;
  total: number;
  /** 0–1 по всей программе. */
  ratio: number;
  byTopic: AcademyTopicProgress[];
  isComplete: boolean;
}

export function academyProgress(completedIds: string[]): AcademyProgressView {
  const done = new Set(completedIds);
  const doneCount = ACADEMY_LESSONS.filter((lesson) => done.has(lesson.id)).length;

  const byTopic: AcademyTopicProgress[] = ACADEMY_TOPICS.map((topic) => {
    const lessons = ACADEMY_LESSONS.filter((lesson) => lesson.topic === topic);
    const topicDone = lessons.filter((lesson) => done.has(lesson.id)).length;

    return {
      topic,
      total: lessons.length,
      done: topicDone,
      ratio: lessons.length === 0 ? 0 : topicDone / lessons.length,
    };
  });

  return {
    todayLesson: ACADEMY_LESSONS.find((lesson) => !done.has(lesson.id)) ?? null,
    done: doneCount,
    total: ACADEMY_LESSONS.length,
    ratio: ACADEMY_LESSONS.length === 0 ? 0 : doneCount / ACADEMY_LESSONS.length,
    byTopic,
    isComplete: doneCount === ACADEMY_LESSONS.length,
  };
}
