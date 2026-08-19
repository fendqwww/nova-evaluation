"use client";

import { motion } from "framer-motion";

/**
 * The frame between "nothing" and the app — Telegram launching the webview,
 * the session resolving. Kept to a wordmark rather than a spinner: a spinner
 * promises a determinate wait, and this one has no fixed length.
 *
 * ЗНАК СТОИТ РОВНО — И ЭТО НЕ ОФОРМЛЕНИЕ, А ИСПРАВЛЕНИЕ. Разрядка (letter-spacing)
 * добавляет пробел ПОСЛЕ каждой буквы, включая последнюю. Значит, у строки
 * «Nova» с трекингом 0.3em ширина бокса на 0.3em больше, чем ширина самих букв,
 * и весь пустой хвост висит справа. Бокс центрируется, буквы — нет: они уезжают
 * влево ровно на половину трекинга. Прежний код добавлял `padding-right`, то
 * есть удваивал ошибку вместо того, чтобы её снять. Компенсирует её `padding-left`
 * той же величины: он сдвигает буквы вправо на половину трекинга, и оптический
 * центр совпадает с геометрическим.
 *
 * ПОД ТЕЛЕФОН, А НЕ ПОД МАКЕТ. Размер знака берётся от ширины экрана
 * (`clamp`), а не фиксированным `text-3xl`: на 320px разряжённый «Nova» в 30px
 * занимал почти весь экран и упирался в поля. Вертикаль тоже не «по центру
 * страницы», а по центру безопасной области — в Telegram сверху висит
 * собственная панель, и настоящий центр экрана находится ниже видимого.
 *
 * ПОДПИСЬ — ЗАДАЧА ПРОДУКТА, А НЕ ПЕРЕЧЕНЬ РАЗДЕЛОВ. Было «Сон · Питание ·
 * Тренировки»: три раздела из полутора десятков, то есть обещание меньшего,
 * чем человек получит. Nova ведёт ещё цели, привычки, задачи, внешность, путь,
 * академию, отчёты и коуча — список тут не помещается и не нужен. Одна строка о
 * том, чем это является целиком, честнее любого перечисления.
 */
export function AppLoadingScreen() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-8"
      style={{
        paddingTop: "var(--app-safe-top)",
        paddingBottom: "var(--app-safe-bottom)",
      }}
    >
      <div className="relative flex flex-col items-center gap-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-12 -z-10 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        />

        <span
          className="bg-clip-text font-bold uppercase leading-none text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(100deg, var(--foreground) 0%, var(--accent) 55%, var(--foreground) 100%)",
            // Кегль от ширины экрана: 22px на самых узких, 30px на обычных.
            fontSize: "clamp(1.375rem, 7vw, 1.875rem)",
            letterSpacing: "0.3em",
            // Снимает хвост разрядки справа — разбор в шапке файла.
            paddingLeft: "0.3em",
          }}
        >
          Nova
        </span>

        <div className="h-px w-24 overflow-hidden rounded-full bg-fill-muted">
          <motion.div
            className="h-full w-1/3 rounded-full"
            style={{ background: "var(--accent)" }}
            animate={{ x: ["-120%", "360%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
          />
        </div>
      </div>

      <p className="max-w-[22ch] text-balance text-center text-caption tracking-wide text-subtle-foreground">
        Операционная система твоей жизни
      </p>
    </div>
  );
}
