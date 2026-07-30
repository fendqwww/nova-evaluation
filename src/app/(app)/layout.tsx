import type { ReactNode } from "react";
import { Home, Target, Repeat, ListTodo, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { BottomNavigationItem } from "@/shared/ui/bottom-navigation";

// Active state is derived from the route inside BottomNavigation, so this
// stays a plain declaration of the app's tabs.
const navItems: BottomNavigationItem[] = [
  { key: "home", label: "Главная", href: "/", icon: <Home className="h-4.5 w-4.5" /> },
  { key: "goals", label: "Цели", href: "/goals", icon: <Target className="h-4.5 w-4.5" /> },
  { key: "habits", label: "Привычки", href: "/habits", icon: <Repeat className="h-4.5 w-4.5" /> },
  { key: "tasks", label: "Задачи", href: "/tasks", icon: <ListTodo className="h-4.5 w-4.5" /> },
  { key: "profile", label: "Профиль", href: "/profile", icon: <User className="h-4.5 w-4.5" /> },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell navItems={navItems}>{children}</AppShell>;
}
