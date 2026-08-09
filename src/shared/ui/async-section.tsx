"use client";

import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export interface AsyncSectionProps {
  isPending: boolean;
  isError: boolean;
  /** The section's own skeleton — each one mirrors its real layout, so it stays the caller's. */
  skeleton: ReactNode;
  /** Retry handler. Without one the error state renders without a button. */
  onRetry?: () => void;
  /** The section's icon, reused for the error state so the failure still looks like this screen. */
  icon: ReactNode;
  /** "Дневник не загрузился" — names the thing that failed, not the failure. */
  errorTitle: string;
  errorDescription?: string;
  children: ReactNode;
}

/**
 * Loading, failed, or loaded — decided once.
 *
 * Every section wrote this ladder by hand: `isPending && <Skeleton/>`, then
 * `isError && <EmptyState … onClick={retry}/>`, then the real content guarded
 * by `!isPending && !isError`. Eleven copies meant eleven chances for the
 * guards to disagree — and two screens already rendered their content behind
 * `!isPending && !isError && data` while others checked only two of the three.
 *
 * The copy stays per-section because "Сон не загрузился" is more useful than a
 * generic apology; the *structure* is what moves here.
 */
export function AsyncSection({
  isPending,
  isError,
  skeleton,
  onRetry,
  icon,
  errorTitle,
  errorDescription = "Проверь соединение — данные никуда не делись.",
  children,
}: AsyncSectionProps) {
  if (isPending) {
    return <>{skeleton}</>;
  }

  if (isError) {
    return (
      <EmptyState
        icon={icon}
        title={errorTitle}
        description={errorDescription}
        action={
          onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Повторить
            </Button>
          )
        }
      />
    );
  }

  return <>{children}</>;
}
