"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { TasksView } from "@/features/tasks/components/tasks-view";

export default function TasksPage() {
  return <AppScreen>{() => <TasksView />}</AppScreen>;
}
