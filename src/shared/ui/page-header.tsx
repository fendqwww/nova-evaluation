import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface PageHeaderProps {
  title: string;
  /** The quiet line under the title — what this screen is for, or today's number. */
  subtitle?: ReactNode;
  /** Buttons pinned to the right of the title row. */
  actions?: ReactNode;
  /** A back link or section tabs, above the title. */
  above?: ReactNode;
  className?: string;
}

/**
 * The top of an app screen.
 *
 * Every screen used to write this by hand, which is how fifteen files ended up
 * carrying the literal `text-page font-bold tracking-[-0.028em]` — a size
 * that was in no scale and could not be changed anywhere without being changed
 * in fifteen places. The type now comes from the `text-page` role; the entrance
 * animation, the baseline of the actions against the title, and the gap between
 * title and subtitle come from here.
 *
 * The animation is the CSS `rise-in` keyframe rather than a Framer variant on
 * purpose: a header should be on screen at the first frame, not waiting its turn
 * inside a stagger the rest of the screen owns.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  above,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex animate-[rise-in_var(--duration-slow)_var(--ease-enter)_both] flex-col gap-3",
        className,
      )}
    >
      {above}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-page text-foreground">{title}</h1>
          {subtitle && <p className="text-caption text-muted-foreground">{subtitle}</p>}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
