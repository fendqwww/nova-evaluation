"use client";

import { Sparkles } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/shared/ui/modal";
import type { Insight } from "@/features/insights/types";

export function AiCoachModal({
  open,
  onOpenChange,
  insights,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insights: Insight[];
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Коуч Nova</ModalTitle>
          <ModalDescription>
            Персональные наблюдения на основе вашего профиля и активности.
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col gap-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex gap-3 rounded-xl border border-border bg-surface-2 p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{insight.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ModalContent>
    </Modal>
  );
}
