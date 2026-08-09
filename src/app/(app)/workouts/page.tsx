"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { WorkoutsView } from "@/features/workouts/components/workouts-view";

export default function WorkoutsPage() {
  return <AppScreen>{() => <WorkoutsView />}</AppScreen>;
}
