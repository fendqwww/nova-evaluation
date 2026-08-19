"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { IconChip } from "@/shared/ui/card";
import { haptics } from "@/shared/lib/haptics";
import { markReleaseSeen, seenRelease } from "@/shared/lib/release-storage";
import { APP_VERSION, CHANGELOG } from "@/features/settings/lib/about";

/**
 * «Мы обновили Nova» — один раз на версию, при первом запуске после обновления.
 *
 * ЧТО ЭТО РЕШАЕТ. Приложение менялось молча. Раздел переезжал, экран
 * перестраивался, появлялся справочник упражнений — и человек либо натыкался на
 * это случайно, либо не находил вовсе. «Что нового» лежало в настройках, то
 * есть было доступно тем, кто уже знает, что что-то новое есть.
 *
 * ПОЧЕМУ ЭТО НЕ БАННЕР И НЕ ТУР. Записка показывается один раз, закрывается
 * одним нажатием и не возвращается до следующей версии. Экскурсия по экранам
 * стоила бы человеку минуты на входе, а баннер жил бы на главной, пока его не
 * закроют, — оба варианта берут больше, чем дают.
 *
 * ПОЧЕМУ НЕ ПОКАЗЫВАЕТСЯ НОВИЧКУ. Тот, кто только что прошёл знакомство, видит
 * приложение впервые, и «что изменилось» ему сообщать не о чем. Онбординг
 * записывает текущую версию как просмотренную (см. use-onboarding-flow), поэтому
 * до первой настоящей новой версии записка ему не придёт.
 *
 * ПОЧЕМУ ЗАДЕРЖКА. Экран монтируется одновременно с первым запросом сессии;
 * модалка, всплывшая в тот же кадр, наложилась бы на скелет загрузки. Полсекунды
 * — это «приложение открылось, и вот записка», а не «приложение открылось
 * запиской».
 */
export function WhatsNewGate() {
  const [open, setOpen] = useState(false);
  const release = CHANGELOG[0];

  useEffect(() => {
    if (seenRelease() === APP_VERSION) return;

    const timer = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    markReleaseSeen(APP_VERSION);
    setOpen(false);
  }

  if (!release) return null;

  return (
    <Modal
      open={open}
      // Закрытие свайпом и по фону тоже считается прочтением: заставлять
      // нажимать именно кнопку, чтобы записка не вернулась завтра, — способ
      // сделать из неё раздражитель.
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <ModalContent className="max-h-[88dvh] overflow-y-auto">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <IconChip tone="ai" size="lg">
              <Sparkles className="h-5 w-5" />
            </IconChip>
            <div className="flex flex-col gap-0.5">
              <ModalTitle>Nova обновилась</ModalTitle>
              <p className="text-caption text-muted-foreground">
                Версия {APP_VERSION} · {release.title}
              </p>
            </div>
          </div>
        </ModalHeader>

        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2.5">
            {release.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-caption text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-foreground/85">{item}</span>
              </li>
            ))}
          </ul>

          {/* Одна кнопка, и она закрывает.
              Здесь стояла вторая — «вся история изменений» со ссылкой в
              настройки. Записка на входе делает одну работу: сказать, что
              изменилось, и пустить человека в приложение. Кнопка, уводящая с
              этого пути в другой раздел, работает против неё, а история никуда
              не девается — строка «Что нового» в настройках на месте. */}
          <Button
            className="w-full"
            onClick={() => {
              haptics.tap();
              dismiss();
            }}
          >
            Понятно
          </Button>

          <p className="text-center text-micro text-subtle-foreground">
            Вся история изменений — в настройках, «Что нового»
          </p>
        </div>
      </ModalContent>
    </Modal>
  );
}
