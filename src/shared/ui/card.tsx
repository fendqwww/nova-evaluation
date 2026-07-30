import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

/**
 * Depth levels, not decoration — every level is the same neutral surface
 * system, just a different step of it. `accent` adds a single thin
 * brand-coloured hairline border and nothing else: no tinted fill, no glow.
 * The theme colour otherwise stays out of card backgrounds entirely.
 */
const cardVariants = cva("relative rounded-xl border", {
  variants: {
    elevation: {
      raised: "surface-raised border-border shadow-card",
      lifted: "surface-raised-2 border-border-strong shadow-raised",
      inset: "border-white/5 bg-black/20",
      accent: "surface-raised border-accent-border shadow-card",
    },
  },
  defaultVariants: { elevation: "raised" },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ elevation, className }))} {...props} />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-heading", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-caption text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-4 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

/**
 * The colour-coded squircle that fronts every category row, action and
 * metric. One component so Goal is always the same purple chip everywhere.
 */
const iconChipVariants = cva(
  "flex shrink-0 items-center justify-center rounded-[0.625rem] ring-1 ring-inset ring-white/[0.06]",
  {
    variants: {
      tone: {
        goal: "bg-tint-purple-muted text-tint-purple",
        habit: "bg-tint-orange-muted text-tint-orange",
        task: "bg-tint-blue-muted text-tint-blue",
        score: "bg-tint-green-muted text-tint-green",
        ai: "bg-tint-cyan-muted text-tint-cyan",
        accent: "bg-accent-muted text-accent",
        neutral: "bg-white/[0.06] text-muted-foreground",
      },
      size: {
        sm: "h-7 w-7",
        md: "h-9 w-9",
        lg: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface IconChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof iconChipVariants> {}

export function IconChip({ className, tone, size, ...props }: IconChipProps) {
  return <span className={cn(iconChipVariants({ tone, size, className }))} {...props} />;
}
