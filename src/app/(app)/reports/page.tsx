"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { ReportsView } from "@/features/reports/components/reports-view";

export default function ReportsPage() {
  return <AppScreen>{() => <ReportsView />}</AppScreen>;
}
