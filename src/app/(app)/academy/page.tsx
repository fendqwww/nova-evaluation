"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { AcademyView } from "@/features/academy/components/academy-view";

export default function AcademyPage() {
  return <AppScreen>{() => <AcademyView />}</AppScreen>;
}
