import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Section chrome — the page's vertical rhythm and horizontal gutter in one
 * place. Every section uses it, which is what keeps "много воздуха" consistent
 * instead of each block inventing its own padding.
 */
export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40",
        className,
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** Small all-caps label that sits above a section headline. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="nova-eyebrow inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="nova-gradient-bg h-px w-6 shrink-0 rounded-full opacity-80"
      />
      {children}
    </span>
  );
}

/** A blurred ambient light field. Purely decorative, never focusable. */
export function Glow({
  className,
  tone = "purple",
}: {
  className?: string;
  tone?: "purple" | "blue";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "nova-glow",
        tone === "purple" ? "nova-glow-purple" : "nova-glow-blue",
        className,
      )}
    />
  );
}
