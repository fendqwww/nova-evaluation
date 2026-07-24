import type { ReactNode } from "react";
import { Home } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import type { BottomNavigationItem } from "@/shared/ui/bottom-navigation";

// Placeholder — replaced with real feature tabs once they exist.
const navItems: BottomNavigationItem[] = [
  {
    key: "home",
    label: "Главная",
    href: "/",
    icon: <Home className="h-5 w-5" />,
    isActive: true,
  },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell navItems={navItems}>{children}</AppShell>;
}
