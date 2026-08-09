"use client";

import { useState, type ReactNode } from "react";
import {
  BottomNavigation,
  type BottomNavigationItem,
} from "@/shared/ui/bottom-navigation";
import { RecordSheet } from "@/components/record-sheet";

export interface AppShellProps {
  children: ReactNode;
  navItems: BottomNavigationItem[];
}

/**
 * Background, safe areas, the tab bar and the record sheet it opens.
 * Deliberately *not* the page frame.
 *
 * It used to wrap children in a PageContainer as well, which put a second
 * <main> and a second set of horizontal paddings around every screen that
 * renders its own — Goals, Habits, Tasks and Profile all do. Nested <main> is
 * invalid HTML and the doubled padding made those screens 16px narrower than
 * the Dashboard for no stated reason. Each page now owns exactly one
 * PageContainer, which is the only arrangement where "the page frame" has a
 * single owner.
 *
 * The sheet's open state lives here rather than in the nav so it survives a
 * route change: tapping "Приём пищи" navigates to /nutrition, and the sheet has
 * to close on its own terms rather than being unmounted mid-transition.
 */
export function AppShell({ children, navItems }: AppShellProps) {
  const [isRecordOpen, setRecordOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {children}
      <BottomNavigation items={navItems} onRecord={() => setRecordOpen(true)} />
      <RecordSheet open={isRecordOpen} onOpenChange={setRecordOpen} />
    </div>
  );
}
