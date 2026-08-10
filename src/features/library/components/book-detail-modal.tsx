"use client";

import { Check } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import {
  LIBRARY_CATEGORY_LABELS,
  type LibraryBook,
} from "@/features/library/content/books";

/**
 * Книга целиком: о чём она и три мысли, которые из неё останутся.
 *
 * Три идеи, а не пересказ. Смысл не в том, чтобы заменить книгу — краткое
 * содержание вместо чтения было бы обманом, — а в том, чтобы человек понял, о чём
 * разговор, и решил, его ли это разговор. Ссылок на магазины здесь нет
 * сознательно: приложение о здоровье не должно превращаться в витрину.
 */
export function BookDetailModal({
  book,
  open,
  onOpenChange,
}: {
  book: LibraryBook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!book) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{book.title}</ModalTitle>
          <ModalDescription>
            {book.author} · {book.year} · {LIBRARY_CATEGORY_LABELS[book.category]} ·{" "}
            {book.hours} ч чтения
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <p className="text-caption leading-relaxed text-muted-foreground">{book.summary}</p>

          <div className="flex flex-col gap-2.5">
            <p className="text-label uppercase text-subtle-foreground">Что останется</p>

            <ul className="flex flex-col gap-2">
              {book.keyIdeas.map((idea) => (
                <li key={idea} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.5} />
                  <span className="text-caption leading-snug text-foreground">{idea}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-xl border border-border bg-fill-subtle p-3 text-[0.6875rem] leading-snug text-subtle-foreground">
            Nova не продаёт книги и не отслеживает чтение. Раздел существует, чтобы объяснить,
            какая книга отвечает на твоё сегодняшнее состояние и почему.
          </p>
        </div>
      </ModalContent>
    </Modal>
  );
}
