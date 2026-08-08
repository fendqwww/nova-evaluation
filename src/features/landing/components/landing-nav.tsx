"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { NAV_LINKS, TELEGRAM_APP_URL } from "../constants";
import { NovaMark } from "./nova-mark";

/**
 * Fixed header. Transparent over the hero and frosted once the page scrolls —
 * the chrome only asserts itself when there is content behind it to separate
 * from.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The mobile sheet covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled ? "nova-glass-panel border-b py-3" : "border-b border-transparent py-5",
        )}
      >
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a
            href="#top"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple)"
            aria-label="NOVA — на главную"
          >
            <NovaMark className="h-6 w-6" />
            <span className="text-[0.9375rem] font-semibold tracking-[0.16em] text-white">
              NOVA
            </span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-[0.8125rem] font-medium text-(--nova-text-muted) transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple)"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Кнопка в шапке — вход в продукт, поэтому основной бот. */}
            <a
              href={TELEGRAM_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-full border border-(--nova-hairline-strong) bg-white/[0.03] px-4 py-2 text-[0.8125rem] font-medium text-white transition-colors duration-200 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple) sm:inline-flex"
            >
              Начать бесплатно
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-(--nova-hairline) text-white transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple) md:hidden"
            >
              {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-(--nova-bg)/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-full flex-col justify-center gap-1 px-8">
              {NAV_LINKS.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * index + 0.05, duration: 0.4 }}
                  className="border-b border-(--nova-hairline) py-4 text-2xl font-medium tracking-[-0.03em] text-white"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href={TELEGRAM_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * NAV_LINKS.length + 0.05, duration: 0.4 }}
                className="nova-gradient-bg mt-8 inline-flex h-13 items-center justify-center rounded-full text-[0.9375rem] font-medium text-white"
              >
                Начать бесплатно
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
