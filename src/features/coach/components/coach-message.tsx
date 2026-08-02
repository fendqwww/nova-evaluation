"use client";

import { Sparkles } from "lucide-react";
import { Card, IconChip } from "@/shared/ui/card";
import { CoachAnswerBody } from "@/features/coach/components/coach-answer-body";
import type { CoachMessageItem } from "@/features/coach/types";

/**
 * One turn of the conversation.
 *
 * A coach turn renders its structured card when it has one and falls back to
 * its plain text when it does not — which is what makes an old row, written
 * before a schema change, still readable rather than blank. See toAnswer in
 * coach.repository.ts for the other half of that contract.
 */
export function CoachMessage({ message }: { message: CoachMessageItem }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-accent-border bg-accent-soft px-3.5 py-2.5">
          <p className="whitespace-pre-wrap wrap-break-word text-caption text-foreground">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card elevation="inset" className="p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <IconChip tone="ai" size="sm">
          <Sparkles className="h-3.5 w-3.5" />
        </IconChip>
        <span className="text-label uppercase text-muted-foreground">Коуч Nova</span>
      </div>

      {message.answer ? (
        <CoachAnswerBody answer={message.answer} />
      ) : (
        <p className="whitespace-pre-wrap wrap-break-word text-caption text-muted-foreground">
          {message.text}
        </p>
      )}
    </Card>
  );
}

/** The "…" turn shown while the answer is being written. */
export function CoachThinkingMessage() {
  return (
    <Card elevation="inset" className="p-3.5">
      <div className="flex items-center gap-2">
        <IconChip tone="ai" size="sm">
          <Sparkles className="h-3.5 w-3.5" />
        </IconChip>
        <span className="text-caption text-muted-foreground">Разбираю твои данные</span>
        <span className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1 w-1 animate-pulse rounded-full bg-subtle-foreground"
              style={{ animationDelay: `${index * 160}ms` }}
            />
          ))}
        </span>
      </div>
    </Card>
  );
}
