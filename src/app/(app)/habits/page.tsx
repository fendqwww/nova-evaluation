"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { HabitsView } from "@/features/habits/components/habits-view";

export default function HabitsPage() {
  return <AppScreen>{() => <HabitsView />}</AppScreen>;
}
