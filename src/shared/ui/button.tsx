import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl text-sm font-medium tracking-[-0.01em] transition-[color,background-color,border-color,box-shadow,transform] duration-[--duration-base] ease-[--ease-enter] active:scale-[0.975] active:duration-[--duration-fast] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none disabled:active:scale-100",
  {
    variants: {
      variant: {
        // The accent-tinted drop makes the primary action read as raised
        // rather than painted on — the one place the UI uses coloured light.
        // The top sheen is the same trick the icon chips use, so a filled
        // button and a filled chip are lit from the same direction.
        primary:
          "bg-accent text-accent-foreground shadow-[0_6px_18px_-8px_var(--accent)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/18 before:to-transparent hover:bg-accent-hover hover:shadow-[0_10px_26px_-8px_var(--accent)]",
        secondary:
          "border border-border bg-surface-2 text-foreground shadow-card hover:border-border-strong hover:bg-surface-3",
        ghost: "text-foreground hover:bg-white/[0.06]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_6px_18px_-8px_var(--destructive)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/18 before:to-transparent hover:opacity-90",
      },
      size: {
        sm: "h-8 rounded-lg px-3",
        md: "h-10 px-4",
        lg: "h-[3.25rem] px-6 text-[0.9375rem]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
