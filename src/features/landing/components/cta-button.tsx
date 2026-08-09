import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * The landing's call to action.
 *
 * Always an anchor — every action on this page is navigation (into the app, to
 * an anchor, or out to Telegram), never a form submit. Kept separate from the
 * app's `shared/ui/button`, which is themed by the user's accent and sized for
 * a phone-width Mini App.
 */
export function CtaButton({
  href,
  children,
  variant = "primary",
  external = false,
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group relative inline-flex h-13 items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-[0.9375rem] font-medium tracking-[-0.012em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple) focus-visible:ring-offset-2 focus-visible:ring-offset-(--nova-bg)",
        "active:scale-[0.98]",
        variant === "primary"
          ? "nova-gradient-bg text-white shadow-[0_8px_32px_-8px_rgba(139,92,246,0.7)] hover:shadow-[0_12px_44px_-8px_rgba(139,92,246,0.9)]"
          : "border border-(--nova-hairline-strong) bg-fill-subtle text-white backdrop-blur-sm hover:border-border-strong hover:bg-fill-muted",
        className,
      )}
    >
      {/* Sheen that crosses the primary button on hover — the one flourish it
          gets, and it costs a single transform. */}
      {variant === "primary" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </a>
  );
}
