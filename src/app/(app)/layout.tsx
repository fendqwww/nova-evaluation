import type { ReactNode } from "react";
import { Home, Dumbbell, Sparkles, User, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ThemeScript } from "@/components/theme-script";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ConsentGate } from "@/features/legal/components/consent-gate";
import { DeepLinkRouter } from "@/features/bot/components/deep-link-router";
import type { BottomNavigationItem } from "@/shared/ui/bottom-navigation";

// Active state is derived from the route inside BottomNavigation, so this
// stays a plain declaration of the app's tabs.
//
// ПЯТЬ ВКЛАДОК: СЕГОДНЯ · ПИТАНИЕ · ТРЕНИРОВКИ · КОУЧ · ПРОФИЛЬ.
//
// Раскладка пришла к этому в три шага. Сначала были Сегодня · Здоровье · Коуч ·
// План · Профиль — пять слотов, но три из них вели в группы, а не в экраны, и
// платило за это «Питание», самый частый раздел в приложении, сидевший за
// вкладкой «Здоровье» вместе с тремя другими экранами. Потом группы разошлись на
// собственные вкладки, «Коуч» уехал на главную карточкой, а освободившийся центр
// занял «+» — лист записи.
//
// Теперь «Коуч» вернулся, и вместе с ним изменилось разделение труда. Прежний
// довод против вкладки был верен ровно наполовину: вкладка действительно вела в
// пустой чат, где сначала надо придумать, о чём спросить. Но экран коуча с тех
// пор перестал быть чатом — он открывается разбором дня, постоянными сигналами и
// отчётом «вчера против сегодня» (CoachView), то есть говорит что-то полезное до
// первого нажатия, а диалог спрятан за кнопку. Такому экрану вкладка нужна:
// личный тренер, до которого надо идти через главный экран, не ощущается
// постоянно доступным, а именно это ощущение раздел и продаёт.
//
// Кнопка «+» ушла из центра панели — пятая вкладка встала на её место. Сценарий
// записи от этого выиграл: четыре самых частых действия (фото еды, приём пищи,
// тренировка, сон) стоят теперь прямо на главном экране отдельными плитками
// (QuickActions), то есть видны сразу, а не спрятаны за нажатием, о котором надо
// догадаться. Остальное — вода, вес, цель, привычка, задача — за кнопкой «Ещё»
// там же. Стоимость записи с любого экрана не изменилась: было «+» → действие,
// стало «Сегодня» → действие, те же два нажатия.
//
// Что открывается не вкладкой:
//   Сон и Внешность — через HealthSectionTabs, полоску на всех четырёх экранах
//     здоровья, и через кольца состояния и план дня на главной.
//   Путь, Библиотека, Академия, Цели, Привычки, Задачи, Отчёты, Настройки —
//     через Профиль. alsoActiveFor держит вкладку подсвеченной на всех из них.
//
// ПОЧЕМУ «СОН» И «ВНЕШНОСТЬ» БОЛЬШЕ НЕ ПОДСВЕЧИВАЮТ ЧУЖУЮ ВКЛАДКУ. Сон стоял в
// alsoActiveFor у «Тренировок», внешность — у «Профиля». Подсветка вкладки это
// ответ на вопрос «где я сейчас», и на экране сна она отвечала «в тренировках»,
// то есть врала. Лучше не подсвечивать ничего, чем подсветить чужой раздел:
// пустая панель читается как «этот экран не живёт во вкладках», подсвеченная
// чужая — как ошибка навигации. Оба экрана остаются в одном нажатии от полоски
// HealthSectionTabs, которая и показывает, где человек находится.
const navItems: BottomNavigationItem[] = [
  { key: "home", label: "Сегодня", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  {
    key: "nutrition",
    label: "Питание",
    href: "/nutrition",
    icon: <UtensilsCrossed className="h-4.5 w-4.5" />,
  },
  {
    key: "workouts",
    label: "Тренировки",
    href: "/workouts",
    icon: <Dumbbell className="h-4.5 w-4.5" />,
  },
  {
    key: "coach",
    label: "Коуч",
    href: "/coach",
    icon: <Sparkles className="h-4.5 w-4.5" />,
  },
  {
    key: "profile",
    label: "Профиль",
    href: "/profile",
    alsoActiveFor: [
      "/path",
      "/library",
      "/academy",
      "/settings",
      "/reports",
      "/goals",
      "/habits",
      "/tasks",
    ],
    icon: <User className="h-4.5 w-4.5" />,
  },
];

// The Telegram session boots here rather than in the root layout, so the
// public marketing pages never pay for (or wait on) the Mini App SDK.
//
// ConsentGate стоит внутри AppShell и снаружи всех экранов: обязательное
// согласие — условие доступа ко всему приложению, а не к отдельной странице, и
// проверка на каждом экране по отдельности означала бы один забытый экран.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {/* Красит тему до первого кадра — стоит первым, потому что всё, что ниже,
          рисуется уже в ней. Подробности в ThemeScript. */}
      <ThemeScript />
      <TelegramProvider>
        <AppShell navItems={navItems}>
          {/* Приземление по ссылке из бота — внутри гейта согласий: человек,
              который ещё не подтвердил документы, должен увидеть их, а не
              раздел, на который вела кнопка. */}
          <ConsentGate>
            <DeepLinkRouter />
            {children}
          </ConsentGate>
        </AppShell>
      </TelegramProvider>
    </QueryProvider>
  );
}
