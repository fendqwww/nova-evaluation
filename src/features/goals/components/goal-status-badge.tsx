import { cn } from "@/shared/lib/cn";
import { statusBadgeClass } from "@/features/goals/lib/tone";
import type { GoalStatus } from "@/features/goals/lib/format";

export function GoalStatusBadge({
  status,
  className,
}: {
  status: GoalStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]",
        statusBadgeClass(status.tone),
        className,
      )}
    >
      {status.label}
    </span>
  );
}
