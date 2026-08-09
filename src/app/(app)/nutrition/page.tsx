"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { NutritionView } from "@/features/nutrition/components/nutrition-view";

export default function NutritionPage() {
  return <AppScreen>{() => <NutritionView />}</AppScreen>;
}
