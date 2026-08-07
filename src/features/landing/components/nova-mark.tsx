import { cn } from "@/shared/lib/cn";

/**
 * The NOVA mark — a four-pointed star built from two crossed arcs, one per
 * gradient stop. Drawn rather than imported: it inherits the brand gradient,
 * stays sharp at every size, and adds no network request.
 */
export function NovaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="nova-mark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5c0 5.799 4.701 10.5 10.5 10.5-5.799 0-10.5 4.701-10.5 10.5C12 16.701 7.299 12 1.5 12 7.299 12 12 7.299 12 1.5Z"
        fill="url(#nova-mark-gradient)"
      />
    </svg>
  );
}
