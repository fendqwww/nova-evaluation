import type { ReactNode } from "react";
import { Home, Target, Repeat, ListTodo, HeartPulse, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TelegramProvider } from "@/components/providers/telegram-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import type { BottomNavigationItem } from "@/shared/ui/bottom-navigation";

// Active state is derived from the route inside BottomNavigation, so this
// stays a plain declaration of the app's tabs.
//
// Коуч sits between the doing-tabs and Профиль rather than at the end: the
// first five tabs are the things you *do*, and the Coach is what reads them —
// putting it after Профиль would file it as a settings screen.
//
// Seven tabs leave roughly 48px each on a 375px phone, which "Привычки" already
// fills — an eighth tab for Nutrition would wrap onto a second line and break
// the row's alignment. Тренировки, Питание, Сон and Внешность share one
// "Здоровье" tab instead: it opens on /workouts, and HealthSectionTabs
// (rendered at the top of all four screens) is what actually switches between
// them — alsoActiveFor is what keeps the tab lit while on any of them.
const navItems: BottomNavigationItem[] = [
  { key: "home", label: "Главная", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  { key: "goals", label: "Цели", href: "/goals", icon: <Target className="h-4.5 w-4.5" /> },
  { key: "habits", label: "Привычки", href: "/habits", icon: <Repeat className="h-4.5 w-4.5" /> },
  { key: "tasks", label: "Задачи", href: "/tasks", icon: <ListTodo className="h-4.5 w-4.5" /> },
  {
    key: "health",
    label: "Здоровье",
    href: "/workouts",
    alsoActiveFor: ["/nutrition", "/sleep", "/appearance"],
    icon: <HeartPulse className="h-4.5 w-4.5" />,
  },
  { key: "coach", label: "Коуч", href: "/coach", icon: <Sparkles className="h-4.5 w-4.5" /> },
  // Настройки has no tab of its own — the row is full at seven, and settings
  // are reached from Профиль, which is where every phone already teaches people
  // to look. alsoActiveFor is what keeps the tab lit while on /settings, the
  // same trick Здоровье uses for the four screens behind it.
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
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TelegramProvider>
        <AppShell navItems={navItems}>{children}</AppShell>
      </TelegramProvider>
    </QueryProvider>
  );
}
