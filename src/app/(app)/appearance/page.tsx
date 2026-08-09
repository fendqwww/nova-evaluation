"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { AppearanceView } from "@/features/appearance/components/appearance-view";

export default function AppearancePage() {
  return <AppScreen>{() => <AppearanceView />}</AppScreen>;
}
