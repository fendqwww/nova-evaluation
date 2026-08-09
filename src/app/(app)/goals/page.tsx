"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { GoalsView } from "@/features/goals/components/goals-view";

export default function GoalsPage() {
  return <AppScreen>{() => <GoalsView />}</AppScreen>;
}
