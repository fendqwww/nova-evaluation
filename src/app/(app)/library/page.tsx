"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { LibraryView } from "@/features/library/components/library-view";

export default function LibraryPage() {
  return <AppScreen>{() => <LibraryView />}</AppScreen>;
}
