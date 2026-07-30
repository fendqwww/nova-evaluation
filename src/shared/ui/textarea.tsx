import * as React from "react";
import { cn } from "@/shared/lib/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// Deliberately the same border, fill, radius and focus ring as Input — a note
// field is the multiline version of a text field, not a different control.
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[4.5rem] w-full resize-none rounded-xl border border-border bg-input px-4 py-3 text-body text-foreground transition-[border-color,box-shadow] duration-200 placeholder:text-subtle-foreground focus-visible:border-accent-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
