"use client";

import {
  Camera,
  Check,
  Dumbbell,
  Flame,
  Lock,
  Repeat,
  Sparkles,
  Target,
  Trophy,
  Utensils,
} from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import {
  unlockedCount,
  type AchievementDef,
  type AchievementProgress,
} from "@/features/profile/lib/achievements";

const ICONS: Record<AchievementDef["icon"], typeof Trophy> = {
  target: Target,
  flame: Flame,
  dumbbell: Dumbbell,
  check: Check,
  utensils: Utensils,
  sparkles: Sparkles,
  trophy: Trophy,
  camera: Camera,
  repeat: Repeat,
};

/**
 * The trophy case.
 *
 * A locked badge shows its progress rather than a padlock and nothing else:
 * "62 / 100 задач" is a reason to keep going, while a grey square is only a
 * reminder that you have not. That is the entire argument for showing the
 * whole catalogue instead of just what has been earned.
 *
 * Nothing here is stored — every badge is a threshold evaluated against a live
 * count, see the note at the top of lib/achievements.ts.
 */
export function AchievementsCard({ items }: { items: AchievementProgress[] }) {
  const unlocked = unlockedCount(items);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-section text-subtle-foreground">Достижения</h2>
        <span className="numeric text-caption text-subtle-foreground">
          {unlocked} из {items.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = ICONS[item.def.icon];

          return (
            <Card
              key={item.def.id}
              elevation={item.isUnlocked ? "accent" : "raised"}
              className={cn(!item.isUnlocked && "opacity-70")}
            >
              <div className="flex flex-col gap-2.5 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <IconChip tone={item.isUnlocked ? item.def.tone : "neutral"} size="md">
                    <Icon className="h-4 w-4" />
                  </IconChip>
                  {!item.isUnlocked && (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" />
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <p className="text-body font-medium text-foreground">{item.def.title}</p>
                  <p className="text-caption text-muted-foreground">
                    {item.def.description}
                  </p>
                </div>

                {item.isUnlocked ? (
                  <p className="text-caption text-accent">Получено</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-fill-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.round(item.ratio * 100)}%` }}
                      />
                    </div>
                    <p className="numeric text-caption text-subtle-foreground">
                      {Math.min(item.value, item.goal)} / {item.goal}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
