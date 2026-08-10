"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRawInitData } from "@tma.js/sdk-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { haptics } from "@/shared/lib/haptics";
import { logWeightAction } from "@/features/profile/server/log-weight.action";

/**
 * Запись веса.
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. Вес спрашивали один раз в онбординге, и изменить его было
 * нельзя вообще: карточка «Тело» всегда писала «нет истории», путь «похудеть на
 * 8 кг» не имел способа увидеть прогресс, а норма калорий навсегда считалась от
 * веса, который человек назвал в первый день. Это была не недоделанная функция,
 * а неверное утверждение о человеке, которое приложение повторяло месяцами.
 *
 * Одно поле и одна кнопка — сознательно. Дата не спрашивается: вес записывается
 * на сегодня, потому что взвешиваются утром того дня, когда открывают приложение,
 * а поле даты в форме из одного числа удваивает её сложность ради случая, который
 * почти не встречается. Повторная запись за тот же день просто уточняет прежнюю
 * (см. logWeight).
 *
 * Своя мутация внутри модалки, а не в общем хуке: так же устроены все формы в
 * приложении — короткое ожидание внутри листа честно, а глобальный оптимизм ради
 * одного числа усложнил бы кэш профиля без выигрыша.
 */
export function WeightLogModal({
  open,
  onOpenChange,
  currentWeightKg,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Текущий вес — подставляется в поле, чтобы правка была правкой, а не вводом. */
  currentWeightKg: number;
  onSaved: () => void;
}) {
  const rawInitData = useRawInitData();
  const [value, setValue] = useState(String(currentWeightKg));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: logWeightAction,
    onSuccess: () => {
      haptics.success();
      onSaved();
      onOpenChange(false);
    },
    onError: () => {
      haptics.error();
      setError("Не удалось сохранить. Попробуй ещё раз.");
    },
  });

  function submit() {
    const parsed = Number(value.replace(",", "."));

    // Границы те же, что на сервере и в онбординге. Проверка здесь — чтобы
    // человек увидел причину сразу, а не после запроса; сервер всё равно
    // проверяет сам, потому что клиенту нельзя верить.
    if (!Number.isFinite(parsed) || parsed < 20 || parsed > 300) {
      setError("Введи вес от 20 до 300 кг");
      return;
    }

    setError(null);
    mutation.mutate({ rawInitData, weightKg: parsed });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Записать вес</ModalTitle>
          <ModalDescription>
            Утром, до еды — так замеры сравнимы между собой. Nova пересчитает прогресс цели.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-foreground">Вес сегодня</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={20}
                max={300}
                step="0.1"
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                disabled={mutation.isPending}
                className="numeric"
              />
              <span className="shrink-0 text-body text-muted-foreground">кг</span>
            </div>
          </label>

          {error && <p className="text-caption text-destructive">{error}</p>}

          <Button size="lg" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Сохраняем
              </>
            ) : (
              "Сохранить"
            )}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
