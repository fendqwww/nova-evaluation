"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { PageContainer } from "@/shared/ui/page-container";

export default function DashboardPage() {
  return (
    <AppScreen>
      {() => (
        <PageContainer>
          <DashboardView />
        </PageContainer>
      )}
    </AppScreen>
  );
}
