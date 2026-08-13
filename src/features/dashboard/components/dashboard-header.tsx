"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/shared/ui/avatar";

function getGreeting(timezone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(new Date()),
  );

  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 17) return "Добрый день";
  if (hour >= 17 && hour < 23) return "Добрый вечер";
  return "Доброй ночи";
}

/**
 * Шапка главного экрана: марка, приветствие, аватар.
 *
 * ЗДЕСЬ БЫЛА ТРЕТЬЯ СТРОКА — вывод Nova о дне («Питание держится на 72. Слабое
 * место дня — сон: 41 из 100»). Она собиралась из настоящих чисел и всё равно
 * ушла: следом за ней стоит NOVA Score, где те же четыре показателя видны
 * долями и фактами, и строка была их пересказом словами. Экран, который
 * начинается с абзаца о том, что человек и так сейчас увидит, тратит первый
 * самый дорогой блок на повтор.
 *
 * Марка набрана мелко и нужна ровно один раз: приложение, которое кричит
 * собственным названием на весь экран, ещё не уверено, что оно полезно.
 */
export function DashboardHeader({
  firstName,
  photoUrl,
  timezone,
}: {
  firstName: string;
  photoUrl: string | null;
  timezone: string;
}) {
  const [greeting, setGreeting] = useState(() => getGreeting(timezone));

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting(timezone)), 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-label uppercase text-subtle-foreground">NOVA</p>
        <p className="mt-1 text-page text-foreground">
          {greeting}, {firstName}
        </p>
      </div>
      <Avatar src={photoUrl} name={firstName} size={44} />
    </div>
  );
}
