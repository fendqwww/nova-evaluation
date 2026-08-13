"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  ListTodo,
  Repeat,
  Route,
  Settings,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { useAddIntent } from "@/shared/lib/use-add-intent";
import { useProfileOverview } from "@/features/profile/hooks/use-profile-overview";
import { ProfileSkeleton } from "@/features/profile/components/profile-skeleton";
import { ProfileHeaderCard } from "@/features/profile/components/profile-header-card";
import { ProfileStatsCard } from "@/features/profile/components/profile-stats";
import { BodyCard } from "@/features/profile/components/body-card";
import { ProfileGoalCard } from "@/features/profile/components/goal-card";
import { WeightLogModal } from "@/features/profile/components/weight-log-modal";
import { ActivityCard } from "@/features/profile/components/activity-card";
import { AchievementsCard } from "@/features/profile/components/achievements-card";
import { AiProfileCard } from "@/features/profile/components/ai-profile-card";
import { ProfileSubscriptionCard } from "@/features/profile/components/subscription-card";
import { SectionLinks } from "@/features/profile/components/section-links";
import { ThemePicker } from "@/features/profile/components/theme-picker";
import { evaluateAchievements } from "@/features/profile/lib/achievements";
import { ACTIVITY_CHART_DAYS } from "@/features/profile/lib/constants";
import { DEFAULT_THEME, type ThemeValue } from "@/shared/config/themes";

/**
 * Профиль — кто ты, куда идёшь и что Nova о тебе знает.
 *
 * ПОРЯДОК — ЭТО АРГУМЕНТ, и в нём изменилось одно: между «кто я» и «что я
 * сделал» встало «куда я иду». Раньше экран читался как отчёт о прошлом —
 * личность, тело, счёт, история, достижения — и человек, открывший его в
 * середине трёхмесячного пути, не находил на нём своей цели вовсе.
 *
 * Теперь: личность → тело → цель и её прогресс → чем это подтверждено (счёт,
 * ритм, достижения) → чем это поддерживается (путь, библиотека, академия,
 * планирование) → отношения с приложением (AI, подписка, тема, настройки).
 *
 * Настройки остаются последними, потому что это выход с экрана, а тема — здесь,
 * потому что это единственная действительно личная настройка.
 */
export function ProfileView({ themeColor }: { themeColor: string }) {
  const { overview, isPending, isError, retry, refresh } = useProfileOverview();
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightKey, setWeightKey] = useState(0);
  /**
   * Пришли из листа записи по «Вес» (`/profile?add=weight`) — форма открывается
   * сразу, чтобы нажатие в листе было последним. Интент выводится, а не
   * заталкивается в состояние, и гасится после закрытия: то же правило, что в
   * разделах «Питание» и «Путь».
   */
  const addIntent = useAddIntent();
  const [intentDismissed, setIntentDismissed] = useState(false);

  // Achievements are derived from the snapshot rather than fetched — no table,
  // no unlock rows, see the note at the top of lib/achievements.ts. Memoised
  // only because the list re-sorts unlocked-first and there is no reason to do
  // that on every render.
  const achievements = useMemo(
    () => (overview ? evaluateAchievements(overview) : []),
    [overview],
  );

  return (
    <PageContainer className="flex flex-col gap-4">
      <PageHeader title="Профиль" subtitle="Всё, что вы построили в Nova" />

      {isPending && <ProfileSkeleton />}

      {isError && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Профиль не загрузился"
          description="Проверь соединение — данные никуда не делись."
          action={
            <Button variant="secondary" onClick={retry}>
              Повторить
            </Button>
          }
        />
      )}

      {!isPending && !isError && overview && (
        <Reveal className="gap-4">
          <RevealItem>
            <ProfileHeaderCard account={overview.account} />
          </RevealItem>

          {/* Directly under the identity header: in a health product the body
              is who you are on this screen, and it used to appear nowhere on
              it. */}
          <RevealItem>
            <BodyCard
              ai={overview.ai}
              startWeightKg={overview.startWeightKg}
              onLogWeight={() => {
                setWeightKey((n) => n + 1);
                setWeightOpen(true);
              }}
            />
          </RevealItem>

          {/* Цель — сразу под телом: вместе они и есть ответ «вот мои цифры, вот
              куда они двигаются». */}
          <RevealItem>
            <ProfileGoalCard path={overview.path} />
          </RevealItem>

          <RevealItem>
            <ProfileStatsCard
              lifeScore={overview.lifeScore}
              streak={overview.streak}
              totals={overview.totals}
            />
          </RevealItem>

          <RevealItem>
            <ActivityCard
              activity={overview.activity}
              counts={overview.counts}
              chartDays={ACTIVITY_CHART_DAYS}
            />
          </RevealItem>

          <RevealItem>
            <AchievementsCard items={achievements} />
          </RevealItem>

          <RevealItem>
            <AiProfileCard ai={overview.ai} />
          </RevealItem>

          <RevealItem>
            <ProfileSubscriptionCard plan={overview.account.plan} />
          </RevealItem>

          <RevealItem>
            <ThemePicker current={(themeColor as ThemeValue) ?? DEFAULT_THEME} />
          </RevealItem>

          {/* Все разделы без своей вкладки — одним блоком с подзаголовками.
              Было три отдельные карточки подряд («Развитие», «План», «Ещё»),
              то есть три одинаковых прямоугольника со ссылками, делившие низ
              профиля на равные куски. Разбор слияния — в SectionLinks.

              Порядок групп сохранён и остаётся аргументом: развитие выше
              планирования, потому что человек, не знающий, что делать,
              приходит за маршрутом, а не за списком задач; «Настройки»
              последние, потому что это выход с экрана.

              «Коуч Nova» из «Развития» ушёл раньше: у него постоянная вкладка
              внизу, видимая с любого экрана, и строка здесь дублировала бы её,
              ничего не добавляя. */}
          <RevealItem>
            <SectionLinks
              groups={[
                {
                  key: "growth",
                  title: "Развитие",
                  items: [
                    {
                      key: "path",
                      href: "/path",
                      label: "Мой путь",
                      hint: overview.path
                        ? `${overview.path.title} · ${overview.path.percent}%`
                        : "Выбрать цель и получить маршрут",
                      tone: "accent",
                      icon: <Route className="h-4 w-4" />,
                    },
                    {
                      key: "academy",
                      href: "/academy",
                      label: "Академия",
                      hint: "Короткие уроки: питание, тренировки, сон, привычки",
                      tone: "ai",
                      icon: <GraduationCap className="h-4 w-4" />,
                    },
                    {
                      key: "library",
                      href: "/library",
                      label: "Библиотека",
                      hint: "Книги под твою проблему, с объяснением зачем",
                      tone: "goal",
                      icon: <BookOpen className="h-4 w-4" />,
                    },
                  ],
                },
                {
                  key: "plan",
                  title: "План",
                  items: [
                    {
                      key: "goals",
                      href: "/goals",
                      label: "Цели",
                      hint: "Большие результаты и шаги к ним",
                      tone: "goal",
                      icon: <Target className="h-4 w-4" />,
                    },
                    {
                      key: "habits",
                      href: "/habits",
                      label: "Привычки",
                      hint: "Регулярность и серии",
                      tone: "habit",
                      icon: <Repeat className="h-4 w-4" />,
                    },
                    {
                      key: "tasks",
                      href: "/tasks",
                      label: "Задачи",
                      hint: "Разовые дела со сроком",
                      tone: "task",
                      icon: <ListTodo className="h-4 w-4" />,
                    },
                  ],
                },
                {
                  key: "more",
                  title: "Ещё",
                  items: [
                    {
                      key: "appearance",
                      href: "/appearance",
                      label: "Внешность",
                      hint: "Уход, фото прогресса, цели",
                      tone: "ai",
                      icon: <Wand2 className="h-4 w-4" />,
                    },
                    {
                      key: "reports",
                      href: "/reports",
                      label: "Отчёты",
                      hint: "Прогресс по всем сферам, графики, AI-сводка",
                      tone: "neutral",
                      icon: <BarChart3 className="h-4 w-4" />,
                    },
                    {
                      key: "settings",
                      href: "/settings",
                      label: "Настройки",
                      hint: "Тема, регион, уведомления, данные",
                      tone: "neutral",
                      icon: <Settings className="h-4 w-4" />,
                    },
                  ],
                },
              ]}
            />
          </RevealItem>
        </Reveal>
      )}

      {overview && (
        <WeightLogModal
          key={`weight-${weightKey}`}
          open={weightOpen || (addIntent === "weight" && !intentDismissed)}
          onOpenChange={(next) => {
            setWeightOpen(next);
            if (!next) setIntentDismissed(true);
          }}
          currentWeightKg={overview.ai.weightKg}
          onSaved={refresh}
        />
      )}
    </PageContainer>
  );
}
