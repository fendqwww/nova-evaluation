"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { CoachView } from "@/features/coach/components/coach-view";

export default function CoachPage() {
  return <AppScreen>{() => <CoachView />}</AppScreen>;
}
