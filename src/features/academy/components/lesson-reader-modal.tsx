"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Clock } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { haptics } from "@/shared/lib/haptics";
import {
  ACADEMY_TOPIC_LABELS,
  type AcademyLesson,
} from "@/features/academy/content/lessons";
import { TARGET_HREF } from "@/features/academy/lib/target-href";

/**
 * Урок целиком.
 *
 * ГЛАВНОЕ В ЭТОМ ЭКРАНЕ — НЕ ТЕКСТ, А ТО, ЧТО ПОД НИМ. Урок заканчивается
 * действием и, где возможно, кнопкой в раздел, где это действие выполняется.
 * Обучение, после которого нечего сделать, — это статья; ценность здесь в том,
 * что от «как работает дефицит калорий» до «рассчитать норму» остаётся одно
 * нажатие.
 *
 * «Прочитал» отмечается вручную, а не по факту открытия. Автоматическая отметка
 * посчитала бы пройденным урок, который человек закрыл через две секунды, и
 * счётчик «12 из 20» перестал бы что-либо значить.
 */
export function LessonReaderModal({
  lesson,
  isCompleted,
  open,
  onOpenChange,
  onToggleCompleted,
}: {
  lesson: AcademyLesson | null;
  isCompleted: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleCompleted: (lessonId: string, isCompleted: boolean) => void;
}) {
  if (!lesson) return null;

  const href = lesson.target === null ? null : TARGET_HREF[lesson.target];

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[92dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{lesson.title}</ModalTitle>
          <ModalDescription>
            {ACADEMY_TOPIC_LABELS[lesson.topic]} · {lesson.minutes} мин
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {lesson.body.map((paragraph, index) => (
              <p
                key={index}
                className="text-body leading-relaxed text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Действие. Отдельной подложкой, потому что это другой род
              высказывания: выше — объяснение, здесь — что с ним делать. */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-accent-border bg-accent-soft p-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-label uppercase text-accent">Что сделать сейчас</p>
              <p className="text-body font-medium text-foreground">{lesson.takeaway}</p>
            </div>

            {href && (
              <Button asChild size="md" variant="secondary" className="w-full">
                <Link href={href} onClick={() => haptics.tap()}>
                  Открыть раздел
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          <Button
            size="lg"
            variant={isCompleted ? "secondary" : "primary"}
            onClick={() => {
              if (isCompleted) haptics.selection();
              else haptics.success();
              onToggleCompleted(lesson.id, !isCompleted);
              if (!isCompleted) onOpenChange(false);
            }}
          >
            {isCompleted ? (
              <>
                <Check className="h-4 w-4" />
                Пройден — снять отметку
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Прочитал
              </>
            )}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
