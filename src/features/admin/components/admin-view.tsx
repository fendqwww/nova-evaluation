"use client";

import { useQuery } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageContainer } from "@/shared/ui/page-container";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Reveal, RevealItem } from "@/shared/ui/reveal";
import { getAdminStats } from "@/features/admin/server/get-admin-stats.action";

/**
 * Панель со сводкой по продукту — внутри приложения, для своих.
 *
 * ПОЧЕМУ ЗДЕСЬ, А НЕ В БРАУЗЕРЕ. Первая версия была отдельной страницей вне
 * Mini App с полем для пароля. Пароль там был вынужденной мерой: снаружи
 * Telegram личность подтвердить нечем. Внутри — есть чем, и проверка по
 * подписанному Telegram id надёжнее общего секрета, который живёт в переменной
 * окружения и пересылается в сообщениях. Заодно исчезла страница, которую надо
 * было верстать отдельно от дизайн-системы.
 *
 * ЗАПРОС ЖИВЁТ ПРЯМО ЗДЕСЬ, без отдельного хука. У остальных разделов хук
 * оправдан тем, что кэш трогают несколько экранов и мутации; тут один экран,
 * одно чтение и ни одной записи — файл-обёртка пересказывал бы useQuery.
 *
 * ЧИСЛА НЕ ОБНОВЛЯЮТСЯ САМИ. staleTime в минуту и кнопка обновления: это
 * сводка, которую читают глазами раз в день, а не монитор. Автоперезапрос
 * означал бы два десятка count() по всей базе каждый раз, когда экран вернулся
 * в фокус.
 */
export function AdminView() {
  const rawInitData = useRawInitData();

  const query = useQuery({
    queryKey: ["admin-stats", rawInitData],
    queryFn: () => getAdminStats(rawInitData),
    staleTime: 60_000,
    retry: false,
  });

  const stats = query.data;
  // Отказ в правах — не сбой связи, и показывать «повторить» на него нельзя:
  // повтор ничего не изменит. Разделяем по тексту ошибки, который бросает
  // requireAdmin.
  const isForbidden =
    query.error instanceof Error && query.error.message.includes("ADMIN_FORBIDDEN");

  return (
    <PageContainer className="flex flex-col gap-4">
      <PageHeader
        title="Панель"
        subtitle="Сводка по продукту, без персональных данных"
        actions={
          <Button
            size="icon"
            variant="secondary"
            aria-label="Обновить"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={query.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        }
      />

      {query.isPending && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {query.isError && (
        <EmptyState
          icon={isForbidden ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          title={isForbidden ? "Раздел недоступен" : "Сводка не загрузилась"}
          description={
            isForbidden
              ? "Панель видна только команде Nova."
              : "Проверь соединение — данные никуда не делись."
          }
          action={
            isForbidden ? undefined : (
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            )
          }
        />
      )}

      {stats && (
        <Reveal className="gap-4">
          <RevealItem>
            <Group
              title="Пользователи"
              items={[
                ["Всего", stats.users.total],
                ["Прошли знакомство", stats.users.onboarded],
                ["Бросили на знакомстве", stats.users.droppedInOnboarding],
                ["Заходили за сутки", stats.users.activeDay],
                ["За 7 дней", stats.users.activeWeek],
                ["За 30 дней", stats.users.activeMonth],
                ["Новых за сутки", stats.users.newDay],
                ["Новых за 7 дней", stats.users.newWeek],
                ["Новых за 30 дней", stats.users.newMonth],
              ]}
            />
          </RevealItem>

          <RevealItem>
            <Group
              title="Тарифы"
              items={[
                ["FREE", stats.plans.free],
                ["PLUS", stats.plans.plus],
                ["MAX", stats.plans.max],
              ]}
            />
          </RevealItem>

          <RevealItem>
            <Group
              title={`AI за ${stats.ai.periodMonth}`}
              items={[
                ["Разборов еды", stats.ai.foodAnalyses],
                ["Разборов внешности", stats.ai.appearanceAnalyses],
                ["Сообщений коучу", stats.ai.coachMessages],
              ]}
            />
          </RevealItem>

          <RevealItem>
            <Group
              title="Чем пользуются"
              items={[
                ["Тренировки", stats.content.workouts],
                ["Проведено сессий", stats.content.workoutSessions],
                ["Записи питания", stats.content.nutritionEntries],
                ["Записи сна", stats.content.sleepLogs],
                ["Привычки", stats.content.habits],
                ["Отметки привычек", stats.content.habitLogs],
                ["Задачи", stats.content.tasks],
                ["Цели", stats.content.goals],
                ["Пути", stats.content.paths],
                ["Процедуры ухода", stats.content.appearanceRoutines],
                ["Фото прогресса", stats.content.appearancePhotos],
                ["Уроки академии", stats.content.academyProgress],
                ["Записи веса", stats.content.weightLogs],
                ["Сообщения коучу", stats.content.coachMessages],
              ]}
            />
          </RevealItem>

          <RevealItem>
            <Group
              title="Бот и поддержка"
              items={[
                ["Нажали /start", stats.bot.started],
                ["Заблокировали", stats.bot.blocked],
                ["Отписались", stats.bot.unsubscribed],
                ["Тикетов всего", stats.support.total],
                ["Открытых", stats.support.open],
              ]}
            />
          </RevealItem>

          <p className="px-1 text-micro text-subtle-foreground">
            Снято {new Date(stats.generatedAt).toLocaleString("ru-RU")}. Только
            агрегаты: ни имён, ни записей конкретных людей здесь нет.
          </p>
        </Reveal>
      )}
    </PageContainer>
  );
}

/**
 * Сетка чисел под заголовком.
 *
 * Три колонки, а не список строк: у всех значений одна природа — счётчик, — и
 * читают их сравнением друг с другом, а не по очереди. `numeric` включает
 * табличные цифры, без которых столбцы разъезжаются на единицах и семёрках.
 */
function Group({ title, items }: { title: string; items: [string, number][] }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-section text-subtle-foreground">{title}</h2>

      <Card>
        <div className="grid grid-cols-3 gap-y-4 p-4">
          {items.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <span className="numeric text-title text-foreground">
                {value.toLocaleString("ru-RU")}
              </span>
              <span className="text-micro leading-tight text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
