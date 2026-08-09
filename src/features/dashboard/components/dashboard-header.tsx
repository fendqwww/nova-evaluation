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
  status,
}: {
  firstName: string;
  photoUrl: string | null;
  timezone: string;
  /**
   * One line from the analysis under the name — the app's read on the day
   * rather than another label. Without it the greeting is decoration; with it
   * the first thing on screen already says something.
   */
  status?: string;
}) {
  const [greeting, setGreeting] = useState(() => getGreeting(timezone));

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting(timezone)), 60_000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-caption font-normal text-muted-foreground">
          {greeting}, <span className="text-foreground">{firstName}</span>
        </p>
        {status && (
          <p className="mt-1 text-title text-foreground">{status}</p>
        )}
      </div>
      <Avatar src={photoUrl} name={firstName} size={44} />
    </div>
  );
}
