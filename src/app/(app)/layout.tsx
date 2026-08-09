import type { ReactNode } from "react";
import { Home, HeartPulse, Sparkles, User, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ConsentGate } from "@/features/legal/components/consent-gate";
import { DeepLinkRouter } from "@/features/bot/components/deep-link-router";
import type { BottomNavigationItem } from "@/shared/ui/bottom-navigation";

// Active state is derived from the route inside BottomNavigation, so this
// stays a plain declaration of the app's tabs.
//
// FIVE TABS, NOT SEVEN. The old row was Главная · Цели · Привычки · Задачи ·
// Здоровье · Коуч · Профиль, which left roughly 48px per tab on a 375px phone
// — "Привычки" already filled its slot edge to edge — and, more importantly,
// spent three of the seven slots on a productivity tracker while the four
// health sections shared one. In a health product that is backwards: logging a
// meal cost four taps and opening a goal cost one.
//
// Цели, Привычки and Задачи now share "План" exactly the way Тренировки,
// Питание, Сон and Внешность share "Здоровье" — same mechanism, applied to the
// sections that are secondary here. Nothing was deleted and no route moved;
// PlanSectionTabs and HealthSectionTabs switch within each pair, and
// alsoActiveFor keeps the tab lit across all the screens behind it.
//
// The centre slot is not a tab at all — see BottomNavigation's onRecord. It
// opens the record sheet, which is what actually fixes the four-tap meal.
const navItems: BottomNavigationItem[] = [
  { key: "home", label: "Сегодня", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  {
    key: "health",
    label: "Здоровье",
    href: "/workouts",
    alsoActiveFor: ["/nutrition", "/sleep", "/appearance"],
    icon: <HeartPulse className="h-4.5 w-4.5" />,
  },
  { key: "coach", label: "Коуч", href: "/coach", icon: <Sparkles className="h-4.5 w-4.5" /> },
  {
    key: "plan",
    label: "План",
    href: "/goals",
    alsoActiveFor: ["/habits", "/tasks"],
    icon: <CalendarCheck className="h-4.5 w-4.5" />,
  },
  // Настройки and Отчёты have no tab of their own — they are reached from
  // Профиль, which is where every phone already teaches people to look.
  // alsoActiveFor is what keeps the tab lit while on either.
  {
    key: "profile",
    label: "Профиль",
    href: "/profile",
    alsoActiveFor: ["/settings", "/reports"],
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
