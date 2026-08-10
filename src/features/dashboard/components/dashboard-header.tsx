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
 * Шапка главного экрана: марка, приветствие и вывод Nova о дне.
 *
 * Три строки, и каждая делает свою работу. Марка нужна ровно один раз и
 * набрана мелко — приложение, которое кричит собственным названием на весь
 * экран, ещё не уверено, что оно полезно. Приветствие персонализирует. Третья
 * строка — единственная, ради которой шапка вообще существует: Nova говорит,
 * где человек сегодня стоит, до того, как он что-либо нажал.
 *
 * `summary` собирается из настоящих скоров (summarizeHealth), а не пишется
 * шаблоном, поэтому шапка не может пообещать того, чего не покажут кольца
 * прямо под ней.
 */
export function DashboardHeader({
  firstName,
  photoUrl,
  timezone,
  summary,
}: {
  firstName: string;
  photoUrl: string | null;
  timezone: string;
  summary?: string;
}) {
  const [greeting, setGreeting] = useState(() => getGreeting(timezone));

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting(timezone)), 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label uppercase text-subtle-foreground">NOVA</p>
          <p className="mt-1 text-page text-foreground">
            {greeting}, {firstName}
          </p>
        </div>
        <Avatar src={photoUrl} name={firstName} size={44} />
      </div>

      {summary && (
        <p className="text-body leading-relaxed text-lead-foreground">{summary}</p>
      )}
    </div>
  );
}
