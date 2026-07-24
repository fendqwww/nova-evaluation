import type { ReactNode } from "react";
import { PageContainer } from "@/shared/ui/page-container";
import {
  BottomNavigation,
  type BottomNavigationItem,
} from "@/shared/ui/bottom-navigation";

export interface AppShellProps {
  children: ReactNode;
  navItems: BottomNavigationItem[];
}

export function AppShell({ children, navItems }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PageContainer>{children}</PageContainer>
      <BottomNavigation items={navItems} />
    </div>
  );
}
