"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { PathView } from "@/features/path/components/path-view";

export default function PathPage() {
  return <AppScreen>{() => <PathView />}</AppScreen>;
}
