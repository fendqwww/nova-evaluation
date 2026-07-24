import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface StepShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function StepShell({
  eyebrow,
  title,
  subtitle,
  onBack,
  children,
  footer,
}: StepShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-10 items-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-white/[0.06] hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        {eyebrow && <p className="text-sm font-medium text-accent">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
        )}

        <div className="mt-10 flex flex-1 flex-col">{children}</div>
      </div>

      {footer && <div className="mt-8">{footer}</div>}
    </div>
  );
}
