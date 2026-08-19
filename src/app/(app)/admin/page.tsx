"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { AdminView } from "@/features/admin/components/admin-view";

/**
 * Панель — обычный экран приложения, а не отдельная страница в браузере.
 *
 * Внутри AppScreen намеренно: сессия, тема и гейт согласий здесь такие же, как
 * везде, и ссылка на неё есть только у того, кому она видна (строка в профиле).
 * Права проверяет сервер на каждом запросе (admin-guard.ts) — отсутствие ссылки
 * в интерфейсе не считается ограничением доступа.
 */
export default function AdminPage() {
  return (
    <AppScreen>
      {() => <AdminView />}
    </AppScreen>
  );
}
