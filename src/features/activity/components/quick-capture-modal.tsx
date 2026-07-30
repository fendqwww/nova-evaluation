"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { createActivityItemAction } from "@/features/activity/server/create-activity-item.action";
import type { ActivityItemType } from "@/features/activity/types";

const COPY: Record<ActivityItemType, { title: string; placeholder: string; cta: string }> = {
  goal: {
    title: "Новая цель",
    placeholder: "Например: пробежать 10 км",
    cta: "Добавить цель",
  },
  habit: {
    title: "Новая привычка",
    placeholder: "Например: пить воду по утрам",
    cta: "Добавить привычку",
  },
  task: {
    title: "Новая задача",
    placeholder: "Например: подготовить отчёт",
    cta: "Добавить задачу",
  },
};

export function QuickCaptureModal({
  type,
  open,
  onOpenChange,
  onCreated,
}: {
  type: ActivityItemType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const rawInitData = useRawInitData();
  const copy = COPY[type];

  const mutation = useMutation({
    mutationFn: createActivityItemAction,
    onSuccess: () => {
      setTitle("");
      onOpenChange(false);
      onCreated();
    },
  });

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    mutation.mutate({ rawInitData, type, title: trimmed });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setTitle("");
        onOpenChange(next);
      }}
    >
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{copy.title}</ModalTitle>
        </ModalHeader>
        <div className="flex flex-col gap-4">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={copy.placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit();
            }}
          />
          {mutation.isError && (
            <p className="text-caption text-destructive">Не удалось сохранить. Попробуйте ещё раз.</p>
          )}
          <Button
            className="w-full"
            size="lg"
            disabled={mutation.isPending || !title.trim()}
            onClick={handleSubmit}
          >
            {mutation.isPending ? "Сохраняем..." : copy.cta}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
