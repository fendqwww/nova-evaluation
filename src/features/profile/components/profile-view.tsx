"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Crown,
  GraduationCap,
  ListTodo,
  Repeat,
  Route,
  Settings,
  ShieldCheck,
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
import { SectionLinks } from "@/features/profile/components/section-links";
import { evaluateAchievements } from "@/features/profile/lib/achievements";
import { ACTIVITY_CHART_DAYS } from "@/features/profile/lib/constants";

/**
 * Профиль — кто ты, куда идёшь и куда отсюда можно попасть.
 *
 * ЧТО ИЗМЕНИЛОСЬ И ПОЧЕМУ. Экран состоял из одиннадцати карточек подряд:
 * личность, тело, цель, счёт, ритм, достижения, AI-профиль, подписка, тема и
 * только потом — список разделов. Каждая по отдельности была осмысленной, а
 * вместе они делали ровно то, на что жаловались: «непонятно, что где и зачем».
 * Профиль в этом приложении — единственный вход в восемь разделов без вкладки
 * (путь, академия, библиотека, цели, привычки, задачи, отчёты, настройки), и
 * вход был закопан под десятью экранами прокрутки.
 *
 * ПОЭТОМУ НАВИГАЦИЯ ПОДНЯЛАСЬ НАВЕРХ. Прежний довод — «настройки последние,
 * потому что это выход с экрана» — верен для настроек и неверен для всего
 * остального: «Мой путь» и «Цели» это не выход, а причина, по которой человек
 * сюда зашёл. Теперь порядок такой: кто я (личность, счёт, тело, цель) → куда
 * отсюда (все разделы) → чем это подтверждено (достижения, ритм, что знает AI).
 * Аналитика не удалена, она перестала стоять на дороге.
 *
 * ЧТО УБРАНО СОВСЕМ. Карточка подписки — она повторяла тариф, который и так
 * написан рядом с именем в шапке, тремя колонками сравнения планов; вместо неё
 * строка «Аккаунт и подписка» в группе «Приложение». Выбор темы — он полностью
 * дублировал раздел «Оформление» в настройках, куда и ведёт строка. Обе
 * функции на месте, просто перестали занимать по экрану каждая.
 *
 * ГРУППЫ НАЗВАНЫ ТЕМ, ЧЕМ ЯВЛЯЮТСЯ. «Развитие / План / Ещё» — три названия, из
 * которых понятно одно. Стало «Персональное / Обучение / План / Приложение»: у
 * академии и библиотеки теперь общий заголовок, который сразу говорит, что это
 * не разделы про тело, а подписи под ними — что именно там лежит.
 */
export function ProfileView({ isAdmin = false }: { isAdmin?: boolean }) {
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
      {/* «Ты», а не «вы»: всё приложение — от онбординга до коуча — обращается
          на «ты», и этот подзаголовок был единственным местом, где Nova вдруг
          переходила на «вы». */}
      <PageHeader title="Профиль" subtitle="Кто ты, куда идёшь и что уже сделано" />

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

          <RevealItem>
            <ProfileStatsCard
              lifeScore={overview.lifeScore}
              streak={overview.streak}
              totals={overview.totals}
            />
          </RevealItem>

          {/* Тело и цель — вместе они и есть ответ «вот мои цифры, вот куда они
              двигаются». В приложении о здоровье это то, ради чего экран
              открывают, поэтому они выше навигации. */}
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

          <RevealItem>
            <ProfileGoalCard path={overview.path} />
          </RevealItem>

          {/* Все разделы без своей вкладки — одним блоком с подзаголовками.
              «Коуч Nova» здесь нет намеренно: у него постоянная вкладка внизу,
              видимая с любого экрана, и строка тут дублировала бы её. */}
          <RevealItem>
            <SectionLinks
              groups={[
                {
                  key: "personal",
                  title: "Персональное",
                  items: [
                    {
                      key: "path",
                      href: "/path",
                      label: "Мой путь",
                      hint: overview.path
                        ? `${overview.path.title} · ${overview.path.percent}%`
                        : "Выбрать цель — Nova соберёт маршрут по шагам",
                      tone: "accent",
                      icon: <Route className="h-4 w-4" />,
                    },
                    {
                      key: "appearance",
                      href: "/appearance",
                      label: "Внешность",
                      hint: "Уход, фото прогресса, разбор по фото",
                      tone: "ai",
                      icon: <Wand2 className="h-4 w-4" />,
                    },
                    {
                      key: "reports",
                      href: "/reports",
                      label: "Отчёты",
                      hint: "Неделя и месяц в графиках, сводка от AI",
                      tone: "neutral",
                      icon: <BarChart3 className="h-4 w-4" />,
                    },
                  ],
                },
                {
                  key: "learning",
                  title: "Обучение",
                  items: [
                    {
                      key: "academy",
                      href: "/academy",
                      label: "Академия",
                      hint: "Уроки на 3 минуты: питание, тренировки, сон, привычки",
                      tone: "ai",
                      icon: <GraduationCap className="h-4 w-4" />,
                    },
                    {
                      key: "library",
                      href: "/library",
                      label: "Библиотека",
                      hint: "Книги под твою задачу — с объяснением, зачем читать",
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
                  key: "app",
                  title: "Приложение",
                  items: [
                    {
                      key: "subscription",
                      href: "/settings/subscription",
                      label: "Аккаунт и подписка",
                      hint: "Тариф, лимиты AI, продление",
                      tone: "goal",
                      icon: <Crown className="h-4 w-4" />,
                    },
                    {
                      key: "settings",
                      href: "/settings",
                      label: "Настройки",
                      hint: "Тема, язык, уведомления, данные и экспорт",
                      tone: "neutral",
                      icon: <Settings className="h-4 w-4" />,
                    },
                    // Единственная строка на экране, которая есть не у всех.
                    // Права проверяет сервер на каждом запросе — здесь решается
                    // только то, показывать ли вход, чтобы у обычного человека
                    // в меню не висел раздел, который ему ответит отказом.
                    ...(isAdmin
                      ? [
                          {
                            key: "admin",
                            href: "/admin",
                            label: "Панель",
                            hint: "Пользователи, тарифы, расход AI, поддержка",
                            tone: "ai" as const,
                            icon: <ShieldCheck className="h-4 w-4" />,
                          },
                        ]
                      : []),
                  ],
                },
              ]}
            />
          </RevealItem>

          <RevealItem>
            <AchievementsCard items={achievements} />
          </RevealItem>

          <RevealItem>
            <ActivityCard
              activity={overview.activity}
              counts={overview.counts}
              chartDays={ACTIVITY_CHART_DAYS}
            />
          </RevealItem>

          <RevealItem>
            <AiProfileCard ai={overview.ai} />
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
