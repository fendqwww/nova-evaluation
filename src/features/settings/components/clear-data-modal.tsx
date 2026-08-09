"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { cn } from "@/shared/lib/cn";
import {
  CLEAR_SCOPES,
  CLEAR_SCOPE_HINTS,
  CLEAR_SCOPE_LABELS,
} from "@/features/settings/schemas";
import { useDataTools } from "@/features/settings/hooks/use-data-tools";
import type { ClearScope } from "@/features/settings/types";

/**
 * Clearing history, one section at a time.
 *
 * Two steps on purpose. The list step shows what each scope holds *right now*,
 * so nobody deletes a hundred diary entries thinking it was three; the confirm
 * step restates the boundary of that scope in words ("продукты останутся") and
 * only then offers a destructive button. This is the only irreversible control
 * in the app, and it is the one place where an extra tap is worth more than the
 * tap it costs.
 *
 * The count the user saw is sent with the request. The server re-checks it and
 * refuses on a mismatch — see clearDataAction — so a dialog left open while the
 * data changed cannot silently delete a different amount than was agreed.
 *
 * An empty scope is disabled rather than hidden: "нечего удалять" is useful
 * information, and a list that changes shape between visits is harder to trust.
 */
export function ClearDataModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { counts, isCountsPending, clearScope, isClearing } = useDataTools(open);
  const [pending, setPending] = useState<ClearScope | null>(null);
  const [done, setDone] = useState<{ scope: ClearScope; removed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function close(next: boolean) {
    if (!next) {
      setPending(null);
      setDone(null);
      setError(null);
    }
    onOpenChange(next);
  }

  async function confirm(scope: ClearScope) {
    setError(null);
    try {
      const result = await clearScope(scope, counts?.[scope] ?? 0);
      setDone(result);
      setPending(null);
    } catch {
      setError("Не удалось очистить. Данные могли измениться — откройте окно заново.");
      setPending(null);
    }
  }

  return (
    <Modal open={open} onOpenChange={close}>
      <ModalContent className="max-h-[88vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>{pending ? "Точно удалить?" : "Очистка данных"}</ModalTitle>
          <ModalDescription>
            {pending
              ? "Это действие нельзя отменить."
              : "Выбери, что удалить. Остальные разделы не затрагиваются."}
          </ModalDescription>
        </ModalHeader>

        {pending ? (
          <div className="flex flex-col gap-4">
            <Card elevation="inset">
              <div className="flex gap-3 p-3.5">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-warning" />
                <div className="flex flex-col gap-1">
                  <p className="text-body font-medium text-foreground">
                    {CLEAR_SCOPE_LABELS[pending]}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {CLEAR_SCOPE_HINTS[pending]}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    Будет удалено: {recordCount(counts?.[pending] ?? 0)}.
                  </p>
                </div>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="lg"
                variant="secondary"
                onClick={() => setPending(null)}
                disabled={isClearing}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                size="lg"
                variant="destructive"
                onClick={() => confirm(pending)}
                disabled={isClearing}
              >
                {isClearing ? "Удаляем…" : "Удалить"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {done && (
              <Card elevation="inset">
                <p className="p-3.5 text-caption text-muted-foreground">
                  {CLEAR_SCOPE_LABELS[done.scope]}: удалено {recordCount(done.removed)}.
                </p>
              </Card>
            )}

            {error && <p className="px-1 text-caption text-destructive">{error}</p>}

            {isCountsPending &&
              CLEAR_SCOPES.map((scope) => (
                <Skeleton key={scope} className="h-16 w-full rounded-xl" />
              ))}

            {!isCountsPending &&
              CLEAR_SCOPES.map((scope) => {
                const count = counts?.[scope] ?? 0;
                const isEmpty = count === 0;

                return (
                  <button
                    key={scope}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => setPending(scope)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition-colors duration-200",
                      isEmpty ? "opacity-45" : "active:bg-fill-subtle",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-body font-medium text-foreground">
                        {CLEAR_SCOPE_LABELS[scope]}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {isEmpty ? "Нечего удалять" : recordCount(count)}
                      </span>
                    </div>
                    {!isEmpty && (
                      <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

function recordCount(count: number): string {
  return `${count} ${pluralizeRu(count, ["запись", "записи", "записей"])}`;
}
