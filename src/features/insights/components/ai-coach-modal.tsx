"use client";

import { Sparkles } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/shared/ui/modal";
import { IconChip } from "@/shared/ui/card";
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
              className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3.5"
            >
              <IconChip tone="ai" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
              </IconChip>
              <div className="min-w-0">
                <p className="text-body font-medium text-foreground">{insight.title}</p>
                <p className="mt-1 text-caption text-muted-foreground">{insight.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ModalContent>
    </Modal>
  );
}
