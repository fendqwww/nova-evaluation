"use client";

import * as React from "react";
import { cn } from "@/shared/lib/cn";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * The on/off control the settings screen is built out of.
 *
 * A plain button with role="switch" rather than a Radix primitive: the app
 * already pulls in @radix-ui/react-dialog for modals, and a toggle is one
 * aria attribute and one translate — a second dependency would be more
 * package than component.
 *
 * The track is the accent colour when on and a neutral surface when off, which
 * is the one place besides the primary button where the theme hue fills a
 * shape. Off deliberately does not use a border-only treatment: at this size it
 * reads as disabled rather than as off.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[1.625rem] w-11 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
        checked ? "bg-accent" : "border-border bg-surface-3",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-[1.125rem] w-[1.125rem] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-200",
          checked ? "translate-x-[1.4375rem]" : "translate-x-[0.1875rem]",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";
