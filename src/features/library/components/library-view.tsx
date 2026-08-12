"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";
import { AsyncSection } from "@/shared/ui/async-section";
import { Card, IconChip } from "@/shared/ui/card";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { haptics } from "@/shared/lib/haptics";
import { useOpenIntent } from "@/shared/lib/use-add-intent";
import { useLibrary } from "@/features/library/hooks/use-library";
import { BookDetailModal } from "@/features/library/components/book-detail-modal";
import {
  LIBRARY_BOOKS,
  LIBRARY_CATEGORIES,
  LIBRARY_CATEGORY_LABELS,
  type LibraryBook,
  type LibraryCategory,
} from "@/features/library/content/books";

/**
 * Библиотека — раздел, который отвечает «почему тебе», а не «вот список».
 *
 * ПОРЯДОК ЭКРАНА. Сверху рекомендации: диагноз, книга и связь между ними. Ниже
 * каталог по категориям. Именно в таком порядке, потому что человек, пришедший в
 * библиотеку приложения о здоровье, не ищет книгу — он ищет ответ на своё
 * состояние, и полка из пятнадцати корешков этот вопрос ему возвращает.
 *
 * Когда рекомендаций нет (данных мало или всё в порядке), экран честно
 * открывается каталогом и говорит об этом одной строкой — вместо выдуманной
 * проблемы ради заполнения блока.
 */
export function LibraryView() {
  const { snapshot, isPending, isError, retry } = useLibrary();
  const [openBook, setOpenBook] = useState<LibraryBook | null>(null);
  const [filter, setFilter] = useState<LibraryCategory | "all">("all");

  /**
   * Пришли по ссылке на конкретную книгу — с экрана пути, из карточки «Что
   * изучить под эту цель» (`/library?open=why-we-sleep`).
   *
   * Ищется в каталоге из кода, а не в `snapshot.books`: каталог одинаков для
   * всех и доступен на первом же кадре, поэтому книга открывается сразу, а не
   * после того, как приедет ответ сервера с рекомендациями. Ненайденный id
   * молча даёт обычный экран библиотеки — см. тот же разбор в AcademyView.
   */
  const openIntent = useOpenIntent();
  const [intentDismissed, setIntentDismissed] = useState(false);
  const intentBook =
    openIntent === null || intentDismissed
      ? null
      : (LIBRARY_BOOKS.find((book) => book.id === openIntent) ?? null);

  const visibleBook = openBook ?? intentBook;

  const books = snapshot?.books ?? [];
  const visible = filter === "all" ? books : books.filter((book) => book.category === filter);

  return (
    <PageContainer className="flex flex-col gap-5">
      <PageHeader
        title="Библиотека"
        subtitle="Книги под то, что происходит у тебя сейчас"
      />

      <AsyncSection
        isPending={isPending}
        isError={isError}
        skeleton={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        }
        onRetry={retry}
        icon={<BookOpen className="h-5 w-5" />}
        errorTitle="Библиотека не загрузилась"
      >
        <Reveal className="gap-5">
          {(snapshot?.recommendations.length ?? 0) > 0 && (
            <RevealItem className="flex flex-col gap-2.5">
              <p className="text-section text-muted-foreground">Тебе сейчас</p>

              <div className="flex flex-col gap-2.5">
                {snapshot?.recommendations.map((item, index) => (
                  <motion.div
                    key={`${item.problem.id}-${item.book.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Card elevation="accent" interactive>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tap();
                          setOpenBook(item.book);
                        }}
                        className="flex w-full flex-col gap-3 p-4 text-left"
                      >
                        {/* Диагноз первым. Это единственная причина, по которой
                            человек читает следующие две строки. */}
                        <div className="flex items-start gap-2.5">
                          <IconChip tone="ai" size="sm">
                            <Sparkles className="h-3.5 w-3.5" />
                          </IconChip>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-label uppercase text-muted-foreground">
                              Твоя проблема
                            </span>
                            <span className="text-body font-medium text-foreground">
                              {item.problem.statement}
                            </span>
                            <span className="numeric text-caption text-muted-foreground">
                              {item.problem.evidence}
                            </span>
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-fill-subtle p-3">
                          <span className="text-label uppercase text-subtle-foreground">
                            Что читать
                          </span>
                          <span className="text-title text-foreground">{item.book.title}</span>
                          <span className="text-caption text-muted-foreground">
                            {item.book.author} · {item.book.hours} ч чтения
                          </span>
                          <span className="mt-1 border-t border-border pt-2 text-caption leading-snug text-muted-foreground">
                            {item.reason}
                          </span>
                        </div>
                      </button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </RevealItem>
          )}

          {snapshot && snapshot.recommendations.length === 0 && (
            <RevealItem>
              <Card>
                <p className="p-4 text-caption leading-relaxed text-muted-foreground">
                  Nova пока не видит слабого места, под которое стоило бы советовать книгу:
                  записывай сон, еду и тренировки неделю — и рекомендация появится здесь сама.
                  А пока полка ниже открыта целиком.
                </p>
              </Card>
            </RevealItem>
          )}

          <RevealItem className="flex flex-col gap-2.5">
            <p className="text-section text-muted-foreground">Все книги</p>

            {/* Фильтр по категориям — горизонтальной лентой, потому что шесть
                кнопок в столбик отодвинули бы сам каталог за экран. */}
            <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-2 pb-0.5">
                {(["all", ...LIBRARY_CATEGORIES] as const).map((id) => {
                  const isActive = filter === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setFilter(id);
                      }}
                      className={cn(
                        "shrink-0 rounded-full border px-3.5 py-2 text-caption font-medium tracking-[-0.01em] transition-colors duration-200",
                        isActive
                          ? "border-accent-border bg-accent-soft text-accent"
                          : "border-border bg-surface-2 text-foreground active:border-border-strong",
                      )}
                    >
                      {id === "all" ? "Все" : LIBRARY_CATEGORY_LABELS[id]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {visible.map((book) => (
                <Card key={book.id} interactive>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tap();
                      setOpenBook(book);
                    }}
                    className="flex w-full items-start gap-3 p-3.5 text-left"
                  >
                    <IconChip tone="goal" size="md">
                      <BookOpen className="h-4 w-4" />
                    </IconChip>

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-body font-medium text-foreground">{book.title}</span>
                      <span className="text-caption text-muted-foreground">
                        {book.author} · {LIBRARY_CATEGORY_LABELS[book.category]} · {book.hours} ч
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-caption leading-snug text-subtle-foreground">
                        {book.summary}
                      </span>
                    </span>
                  </button>
                </Card>
              ))}
            </div>
          </RevealItem>
        </Reveal>
      </AsyncSection>

      <BookDetailModal
        book={visibleBook}
        open={visibleBook !== null}
        onOpenChange={(next) => {
          if (!next) {
            setOpenBook(null);
            setIntentDismissed(true);
          }
        }}
      />
    </PageContainer>
  );
}
