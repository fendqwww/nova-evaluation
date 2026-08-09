"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";

/**
 * The two primitives the whole settings screen is built from.
 *
 * A settings screen is one repeated shape — icon, label, hint, something on the
 * right — and the sections differ only in what that something is. Building it
 * out of two components rather than nine bespoke cards is what keeps nine
 * groups looking like one screen, and it means the row spacing, the divider and
 * the tap target are defined once.
 *
 * Deliberately not tabs. Every other section in the app splits into a
 * sliding-pill tab bar, but those tabs separate *different questions* (today's
 * list against the library against the history); settings are one question
 * asked nine times, and burying half of them behind a tab is how a user ends up
 * unable to find the thing they came here for. One scroll, grouped, is the
 * convention every phone already teaches.
 */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 px-1">
        <h2 className="text-section text-subtle-foreground">{title}</h2>
        {description && (
          <p className="text-caption text-subtle-foreground/80">{description}</p>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border">{children}</div>
      </Card>
    </section>
  );
}

type RowTone = "goal" | "habit" | "task" | "score" | "ai" | "accent" | "neutral";

interface SettingsRowProps {
  icon: ReactNode;
  tone?: RowTone;
  label: string;
  hint?: string | null;
  /** The muted value on the right — "Москва", "Тёмная", "12 записей". */
  value?: string | null;
  /** A switch, a badge, anything that replaces the value/chevron. */
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  /** Paints the label in the destructive colour. For clearing data only. */
  destructive?: boolean;
}

/**
 * One line of a group.
 *
 * Renders as a <button>, a <Link> or a plain <div> depending on what it does —
 * a row with a switch is not a link and must not be focusable as one, and a row
 * that navigates must be a real anchor so it behaves like a link. That is the
 * only reason this branches at all.
 */
export function SettingsRow({
  icon,
  tone = "neutral",
  label,
  hint,
  value,
  trailing,
  onClick,
  href,
  disabled,
  destructive,
}: SettingsRowProps) {
  const body = (
    <>
      <IconChip tone={destructive ? "neutral" : tone} size="md">
        <span className={cn("flex h-full w-full items-center justify-center", destructive && "text-destructive")}>
          {icon}
        </span>
      </IconChip>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span
          className={cn(
            "truncate text-body font-medium",
            destructive ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </span>
        {hint && <span className="text-caption text-muted-foreground">{hint}</span>}
      </span>

      {value && (
        <span className="shrink-0 text-caption text-muted-foreground">{value}</span>
      )}
      {trailing}
      {(onClick || href) && !trailing && (
        <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
      )}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 px-4 py-3.5 transition-colors duration-200",
    (onClick || href) && !disabled && "press-sm active:bg-fill-subtle",
    disabled && "opacity-50",
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

/** The muted "Скоро" chip on a row that stores an intention but does nothing. */
export function SoonBadge({ children = "Скоро" }: { children?: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-fill-muted px-2 py-0.5 text-label text-subtle-foreground">
      {children}
    </span>
  );
}
