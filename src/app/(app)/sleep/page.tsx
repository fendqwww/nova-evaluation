"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { SleepView } from "@/features/sleep/components/sleep-view";

export default function SleepPage() {
  return <AppScreen>{() => <SleepView />}</AppScreen>;
}
