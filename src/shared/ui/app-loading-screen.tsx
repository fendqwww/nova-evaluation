"use client";

import { motion } from "framer-motion";

/**
 * The frame between "nothing" and the app — Telegram launching the webview,
 * the session resolving. Kept to a wordmark rather than a spinner: a spinner
 * promises a determinate wait, and this one has no fixed length.
 *
 * ЧТО ЗДЕСЬ ИЗМЕНИЛОСЬ. Было слово «Nova» обычным полужирным, мигающее
 * прозрачностью от 0,4 до 1. Мигание — это то, что делает индикатор загрузки
 * дешёвым: пульсирующая надпись читается как «что-то подвисло», а не как марка.
 *
 * Теперь это набранный капителью разрядкой знак с градиентной заливкой, под ним
 * тонкая линия, которая наливается слева направо. Разрядка и капитель — то, чем
 * марку отличают от подписи; движение ушло из самого слова в линию под ним,
 * поэтому название стоит неподвижно, как ему и положено, а ожидание показывает
 * отдельный элемент.
 *
 * Подпись под линией названа задачей продукта, а не слоганом: первое, что
 * человек читает при запуске, должно объяснять, куда он попал.
 */
export function AppLoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex flex-col items-center gap-3">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-full opacity-25 blur-2xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        />

        <span
          className="bg-clip-text text-3xl font-bold uppercase tracking-[0.34em] text-transparent"
          // Отступ справа компенсирует разрядку: tracking добавляет пробел и
          // после последней буквы, из-за чего слово визуально уезжает влево.
          style={{
            backgroundImage:
              "linear-gradient(100deg, var(--foreground) 0%, var(--accent) 55%, var(--foreground) 100%)",
            paddingRight: "0.34em",
          }}
        >
          Nova
        </span>

        <div className="h-px w-28 overflow-hidden rounded-full bg-fill-muted">
          <motion.div
            className="h-full w-1/3 rounded-full"
            style={{ background: "var(--accent)" }}
            animate={{ x: ["-120%", "360%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
          />
        </div>
      </div>

      <p className="text-caption tracking-wide text-subtle-foreground">
        Сон · Питание · Тренировки
      </p>
    </div>
  );
}
