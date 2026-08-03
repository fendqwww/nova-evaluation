import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Nothing here yet — said properly.
 *
 * An empty state is the first thing a new user sees on most screens, so it gets
 * real treatment rather than grey text: the icon sits in a raised well with a
 * soft accent bloom behind it, which is the same "one warm point on a neutral
 * screen" idea the Life Score ring uses. The bloom is tiny and heavily blurred
 * on purpose — it should register as light, not as a coloured shape.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] flex-col items-center gap-4 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-3 -z-10 rounded-full opacity-[0.18] blur-2xl"
            style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border surface-raised-2 text-muted-foreground shadow-card edge-light">
            {icon}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="text-title text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-[34ch] text-caption leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-0.5">{action}</div>}
    </div>
  );
}
