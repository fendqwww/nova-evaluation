import type { ReactNode } from "react";
import { Home, Target, Repeat, ListTodo, HeartPulse, Sparkles, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
// the row's alignment. Тренировки and Питание share one "Здоровье" tab instead:
// it opens on /workouts, and HealthSectionTabs (rendered at the top of both
// /workouts and /nutrition) is what actually switches between the two —
// alsoActiveFor is what keeps the tab lit while on either one.
const navItems: BottomNavigationItem[] = [
  { key: "home", label: "Главная", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  { key: "goals", label: "Цели", href: "/goals", icon: <Target className="h-4.5 w-4.5" /> },
  { key: "habits", label: "Привычки", href: "/habits", icon: <Repeat className="h-4.5 w-4.5" /> },
  { key: "tasks", label: "Задачи", href: "/tasks", icon: <ListTodo className="h-4.5 w-4.5" /> },
  {
    key: "health",
    label: "Здоровье",
    href: "/workouts",
    alsoActiveFor: ["/nutrition"],
    icon: <HeartPulse className="h-4.5 w-4.5" />,
  },
  { key: "coach", label: "Коуч", href: "/coach", icon: <Sparkles className="h-4.5 w-4.5" /> },
  { key: "profile", label: "Профиль", href: "/profile", icon: <User className="h-4.5 w-4.5" /> },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell navItems={navItems}>{children}</AppShell>;
}
