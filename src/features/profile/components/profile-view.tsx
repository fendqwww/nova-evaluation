"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Settings, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { useProfileOverview } from "@/features/profile/hooks/use-profile-overview";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { ProfileHeaderCard } from "@/features/profile/components/profile-header-card";
import { ProfileStatsCard } from "@/features/profile/components/profile-stats";
import { ActivityCard } from "@/features/profile/components/activity-card";
import { AchievementsCard } from "@/features/profile/components/achievements-card";
import { AiProfileCard } from "@/features/profile/components/ai-profile-card";
import { ProfileSubscriptionCard } from "@/features/profile/components/subscription-card";
import { ThemePicker } from "@/features/profile/components/theme-picker";
import { evaluateAchievements } from "@/features/profile/lib/achievements";
import { ACTIVITY_CHART_DAYS } from "@/features/profile/lib/constants";
import { DEFAULT_THEME, type ThemeValue } from "@/shared/config/themes";

/**
 * Профиль — who you are, what you have done, and what Nova knows.
 *
 * The order is the argument, the same way it is on the Coach screen. Identity
 * first, then the two numbers that describe today, then the cumulative record,
 * then the rhythm, then the trophies — so the screen reads from "me" outwards
 * to "what I have built". The AI card and the subscription sit below that
 * because they are about the app's relationship with the user rather than about
 * the user, and Настройки is last because it is a way out of this screen.
 *
 * The accent picker stays here rather than moving to Настройки: it is the one
 * genuinely personal piece of configuration, Настройки links to it, and moving
 * it would break that link for no gain.
 */
export function ProfileView({ themeColor }: { themeColor: string }) {
  const { overview, isPending, isError, retry } = useProfileOverview();

  // Achievements are derived from the snapshot rather than fetched — no table,
  // no unlock rows, see the note at the top of lib/achievements.ts. Memoised
  // only because the list re-sorts unlocked-first and there is no reason to do
  // that on every render.
  const achievements = useMemo(
    () => (overview ? evaluateAchievements(overview) : []),
    [overview],
  );

  return (
    <PageContainer className="flex flex-col gap-6">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[1.375rem] font-bold tracking-[-0.028em] text-foreground">
          Профиль
        </h1>
        <p className="text-caption text-muted-foreground">
          Всё, что вы построили в Nova
        </p>
      </header>

      {isPending && <ProfileSkeleton />}

      {isError && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Не удалось загрузить профиль"
          description="Проверьте соединение и попробуйте снова."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && overview && (
        <>
          <ProfileHeaderCard account={overview.account} />

          <ProfileStatsCard
            lifeScore={overview.lifeScore}
            streak={overview.streak}
            totals={overview.totals}
          />

          <ActivityCard
            activity={overview.activity}
            counts={overview.counts}
            chartDays={ACTIVITY_CHART_DAYS}
          />

          <AchievementsCard items={achievements} />

          <AiProfileCard ai={overview.ai} />

          <ProfileSubscriptionCard plan={overview.account.plan} />

          <ThemePicker current={(themeColor as ThemeValue) ?? DEFAULT_THEME} />

          <Card>
            <Link
              href="/settings"
              className="flex items-center gap-3 p-4 transition-colors duration-200 active:bg-white/[0.04]"
            >
              <Settings className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-body font-medium text-foreground">Настройки</span>
                <span className="text-caption text-muted-foreground">
                  Тема, регион, уведомления, данные
                </span>
              </span>
            </Link>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
