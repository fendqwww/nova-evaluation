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
        <p className="text-caption font-normal text-muted-foreground">{greeting},</p>
        {/* The one place besides the ring that carries the brand colour —
            solid accent, no gradient, no second hue. */}
        <h1 className="-mt-0.5 truncate text-display text-accent">{firstName}</h1>
      </div>
      <Avatar src={photoUrl} name={firstName} size={44} />
    </div>
  );
}
