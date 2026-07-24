"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/shared/ui/avatar";

interface GreetingCopy {
  greeting: string;
  subtitle: string;
}

function getGreetingCopy(timezone: string): GreetingCopy {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(new Date()),
  );

  if (hour >= 5 && hour < 12) {
    return { greeting: "Доброе утро", subtitle: "Отличное начало для нового дня." };
  }
  if (hour >= 12 && hour < 17) {
    return { greeting: "Добрый день", subtitle: "Держите фокус — вы на верном пути." };
  }
  if (hour >= 17 && hour < 23) {
    return { greeting: "Добрый вечер", subtitle: "Готовьтесь к завтрашним победам уже сегодня." };
  }
  return { greeting: "Доброй ночи", subtitle: "Пора отдохнуть — Nova позаботится об остальном." };
}

export function DashboardHeader({
  firstName,
  photoUrl,
  timezone,
}: {
  firstName: string;
  photoUrl: string | null;
  timezone: string;
}) {
  const [copy, setCopy] = useState(() => getGreetingCopy(timezone));

  useEffect(() => {
    const interval = setInterval(() => setCopy(getGreetingCopy(timezone)), 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-normal text-muted-foreground">{copy.greeting},</p>
        <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-accent">{firstName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>
      <Avatar src={photoUrl} name={firstName} size={52} />
    </div>
  );
}
