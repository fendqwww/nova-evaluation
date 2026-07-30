import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-6 text-center", className)}>
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white/4 text-subtle-foreground">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        {description && (
          <p className="max-w-[32ch] text-caption text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
