"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { pluralizeRu } from "@/shared/lib/pluralize-ru";
import { PLAN_LABELS } from "@/features/settings/lib/plans";
import type { PlanId } from "@/features/settings/types";
import type { ProfileAccount } from "@/features/profile/types";

const PLAN_CHIP: Record<PlanId, string> = {
  free: "bg-tint-green-muted text-tint-green",
  plus: "bg-tint-blue-muted text-tint-blue",
  max: "bg-tint-purple-muted text-tint-purple",
};

/**
 * Who you are, at the top of your own screen.
 *
 * The plan chip sits next to the name rather than in the subscription block
 * further down, because "какой у меня тариф" is an identity question the user
 * asks at a glance — scrolling to find out which tier you are on is the failure
 * mode this avoids.
 *
 * The gear stays here even though Настройки is a full section of its own: this
 * is where every phone teaches people to look for it, and the tab row has no
 * eighth slot.
 */
export function ProfileHeaderCard({ account }: { account: ProfileAccount }) {
  return (
    <Card>
      <div className="flex items-start gap-4 p-4">
        {/* Sized by prop: Avatar writes width/height as an inline style, which
            a utility class cannot override. */}
        <Avatar src={account.photoUrl} name={account.name} size={64} />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-title text-foreground">{account.name}</h2>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-label",
                PLAN_CHIP[account.plan],
              )}
            >
              {PLAN_LABELS[account.plan].replace("NOVA ", "")}
            </span>
          </div>

          <p className="truncate text-caption text-muted-foreground">
            {account.username ? `@${account.username}` : account.telegramName}
          </p>

          <p className="text-caption text-subtle-foreground">
            В Nova {account.daysWithNova}{" "}
            {pluralizeRu(account.daysWithNova, ["день", "дня", "дней"])}
          </p>
        </div>

        <Button asChild size="icon" variant="secondary" aria-label="Настройки">
          <Link href="/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
