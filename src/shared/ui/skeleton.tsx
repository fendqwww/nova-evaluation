import { cn } from "@/shared/lib/cn";

/**
 * A loading placeholder.
 *
 * The sweep lives in a utility (see skeleton-sheen in globals.css) rather than
 * in a `animate-pulse` class: a pulse makes every placeholder on screen breathe
 * in unison, which reads as a stalled screen, while a highlight travelling in
 * one direction reads as content on its way. It also means one place decides
 * what loading looks like across the app.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-sheen rounded-lg", className)} />;
}
