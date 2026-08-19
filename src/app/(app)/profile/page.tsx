"use client";

import { AppScreen } from "@/features/auth/components/app-screen";
import { ProfileView } from "@/features/profile/components/profile-view";

/**
 * Тема сюда больше не передаётся: выбор акцента жил на профиле отдельной
 * карточкой и полностью повторял раздел «Оформление» в настройках — одна и та
 * же настройка в двух местах. Осталось одно, в настройках, куда с профиля ведёт
 * строка «Настройки». Разбор — в ProfileView.
 *
 * isAdmin берётся из сессии, а не из снимка профиля: это факт о том, кто вошёл,
 * а не о том, что человек про себя заполнил. Строка «Панель» от него только
 * показывается — доступ проверяет сервер (features/admin/server/admin-guard).
 */
export default function ProfilePage() {
  return <AppScreen>{(session) => <ProfileView isAdmin={session.isAdmin} />}</AppScreen>;
}
