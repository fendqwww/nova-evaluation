import Link from "next/link";
import { Send } from "lucide-react";
import { FOOTER_LINKS, NAV_LINKS, TELEGRAM_SUPPORT_URL } from "../constants";
import { NovaMark } from "./nova-mark";

/**
 * Footer. A server component — nothing here is interactive beyond links, so it
 * ships no JavaScript.
 */
export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-(--nova-hairline) px-5 py-14 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* Identity */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5">
              <NovaMark className="h-6 w-6" />
              <span className="text-[0.9375rem] font-semibold tracking-[0.16em] text-white">
                NOVA
              </span>
            </div>
            <p className="mt-4 text-[0.875rem] leading-[1.6] text-(--nova-text-subtle)">
              Персональная система развития. Сон, питание, тренировки и привычки — в одной
              картине.
            </p>
          </div>

          {/* Navigation */}
          <nav className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-2">
            <div>
              <p className="nova-eyebrow mb-4">Продукт</p>
              <ul className="space-y-3">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-[0.875rem] text-(--nova-text-muted) transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="nova-eyebrow mb-4">Документы</p>
              <ul className="space-y-3">
                {FOOTER_LINKS.map((link) =>
                  link.external ? (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.875rem] text-(--nova-text-muted) transition-colors duration-200 hover:text-white"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.875rem] text-(--nova-text-muted) transition-colors duration-200 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </nav>
        </div>

        <hr className="nova-rule my-10" />

        <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-[0.8125rem] text-(--nova-text-faint)">
            © {year} NOVA. Все права защищены.
          </p>
          <a
            href={TELEGRAM_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-(--nova-hairline) px-4 py-2 text-[0.8125rem] text-(--nova-text-muted) transition-colors duration-200 hover:border-(--nova-hairline-strong) hover:text-white"
          >
            <Send className="h-3.5 w-3.5" />
            Поддержка в Telegram
          </a>
        </div>
      </div>
    </footer>
  );
}
