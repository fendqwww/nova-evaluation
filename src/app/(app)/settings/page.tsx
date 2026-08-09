"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { SettingsView } from "@/features/settings/components/settings-view";

export default function SettingsPage() {
  return <AppScreen>{() => <SettingsView />}</AppScreen>;
}
