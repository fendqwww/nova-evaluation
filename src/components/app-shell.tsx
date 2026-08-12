import type { ReactNode } from "react";
import {
  BottomNavigation,
  type BottomNavigationItem,
} from "@/shared/ui/bottom-navigation";

export interface AppShellProps {
  children: ReactNode;
  navItems: BottomNavigationItem[];
}

/**
 * Background, safe areas and the tab bar. Deliberately *not* the page frame.
 *
 * It used to wrap children in a PageContainer as well, which put a second
 * <main> and a second set of horizontal paddings around every screen that
 * renders its own — Goals, Habits, Tasks and Profile all do. Nested <main> is
 * invalid HTML and the doubled padding made those screens 16px narrower than
 * the Dashboard for no stated reason. Each page now owns exactly one
 * PageContainer, which is the only arrangement where "the page frame" has a
 * single owner.
 *
 * ЗАПИСЬ УШЛА ОТСЮДА НА ГЛАВНЫЙ ЭКРАН. Раньше здесь жила центральная кнопка
 * «+» и лист записи с её состоянием. Пятая вкладка («Коуч») заняла центр
 * панели, и держать кнопку было больше негде — но выиграл от этого сам сценарий
 * записи: четыре самых частых действия стоят теперь прямо на главной отдельными
 * плитками (QuickActions), то есть видны сразу, а не спрятаны за нажатием на
 * «+», о котором надо догадаться. Лист никуда не делся — он открывается оттуда
 * же кнопкой «Ещё» и владеет своим состоянием сам.
 *
 * Без состояния этот компонент больше не клиентский.
 */
export function AppShell({ children, navItems }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {children}
      <BottomNavigation items={navItems} />
    </div>
  );
}
