import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface StepShellProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Lets a tall scene scroll internally. The flow is otherwise a fixed-height
   * non-scrolling surface (see the h-dvh in app/onboarding/layout.tsx); only
   * the combined "about you" scene has enough controls to need this on a
   * short viewport.
   */
  scrollable?: boolean;
}

/**
 * The scene where Nova asks something. One question, one screen — the back
 * affordance, the question at full scene size, and room to breathe before the
 * answer and the CTA.
 *
 * No step counter and no progress bar: a completion meter is the single
 * loudest "you are filling out a form" signal a flow can show, and an
 * assistant doesn't tell you how many fields are left.
 */
export function StepShell({
  title,
  subtitle,
  onBack,
  children,
  footer,
  scrollable = false,
}: StepShellProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 active:bg-white/6 active:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-7 flex min-h-0 flex-1 flex-col">
        <h1 className="shrink-0 text-scene text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-4 max-w-[32ch] shrink-0 text-lead text-lead-foreground">
            {subtitle}
          </p>
        )}

        <div
          className={
            scrollable
              ? "mt-9 flex min-h-0 flex-1 flex-col overflow-y-auto"
              : "mt-9 flex min-h-0 flex-1 flex-col"
          }
        >
          {children}
        </div>
      </div>

      {footer && <div className="mt-7 shrink-0">{footer}</div>}
    </div>
  );
}
