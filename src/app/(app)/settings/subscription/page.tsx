"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { SubscriptionView } from "@/features/settings/components/subscription-view";

export default function SubscriptionPage() {
  return <AppScreen>{() => <SubscriptionView />}</AppScreen>;
}
