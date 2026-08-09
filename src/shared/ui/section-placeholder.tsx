import type { ReactNode } from "react";

/**
 * Stands in for a tab whose feature hasn't been built yet. Deliberately says
 * so rather than faking content — the bottom navigation ships all five tabs
 * from the design, and every one of them has to lead somewhere truthful.
 */
export function SectionPlaceholder({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[68vh] flex-col items-center justify-center gap-5 text-center">
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-30 blur-2xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
          aria-hidden
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border surface-raised-2 text-accent shadow-card">
          {icon}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-title text-foreground">{title}</h1>
        <p className="max-w-[28ch] text-caption text-muted-foreground">{description}</p>
      </div>

      <span className="rounded-full border border-border bg-fill-subtle px-3 py-1 text-label uppercase text-subtle-foreground">
        В разработке
      </span>
    </div>
  );
}
