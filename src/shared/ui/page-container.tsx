import * as React from "react";
import { cn } from "@/shared/lib/cn";

export type PageContainerProps = React.HTMLAttributes<HTMLElement>;

export const PageContainer = React.forwardRef<HTMLElement, PageContainerProps>(
  ({ className, ...props }, ref) => (
    <main
      ref={ref}
      className={cn(
        "mx-auto w-full max-w-lg flex-1 px-5",
        "pt-[max(1.25rem,var(--app-safe-top))]",
        "pb-[calc(var(--bottom-nav-height)+max(1.5rem,var(--app-safe-bottom)))]",
        className,
      )}
      {...props}
    />
  ),
);
PageContainer.displayName = "PageContainer";
