"use client";

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { formatDayNumeric } from "@/features/settings/lib/format";
import { APP_STAGE, APP_VERSION, CHANGELOG } from "@/features/settings/lib/about";
import type { DateFormat } from "@/features/settings/types";

/**
 * What has shipped, newest first.
 *
 * A flat list rather than a timeline with connecting rails: five entries do not
 * need a visual structure, and the dates already carry the ordering. Each entry
 * is a section as the user got it, which is why a refactor never appears here.
 */
export function ChangelogModal({
  open,
  onOpenChange,
  dateFormat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFormat: DateFormat;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Что нового</ModalTitle>
          <ModalDescription>
            Nova {APP_VERSION} · {APP_STAGE}
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-5">
          {CHANGELOG.map((entry) => (
            <section key={entry.day} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-heading text-foreground">{entry.title}</h3>
                <span className="numeric shrink-0 text-caption text-subtle-foreground">
                  {formatDayNumeric(entry.day, dateFormat)}
                </span>
              </div>

              <ul className="flex flex-col gap-1.5">
                {entry.items.map((item) => (
                  <li key={item} className="flex gap-2 text-caption text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ModalContent>
    </Modal>
  );
}
