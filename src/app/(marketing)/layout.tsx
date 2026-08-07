import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";
import "./landing.css";

/**
 * The public marketing shell.
 *
 * Deliberately free of the Telegram and React Query providers that the (app)
 * group mounts: every page under here is fully server-rendered static HTML, so
 * crawlers and link unfurlers see real content and the first paint costs no
 * JavaScript.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://nova.app"),
  title: {
    default: "NOVA — твоя персональная система развития",
    template: "%s — NOVA",
  },
  description:
    "NOVA анализирует твой сон, питание, тренировки и привычки, чтобы помочь тебе становиться лучше каждый день.",
  keywords: [
    "NOVA",
    "AI коуч",
    "здоровье",
    "сон",
    "питание",
    "тренировки",
    "привычки",
    "Life Score",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "NOVA",
    title: "NOVA — твоя персональная система развития",
    description:
      "NOVA анализирует твой сон, питание, тренировки и привычки, чтобы помочь тебе становиться лучше каждый день.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NOVA — твоя персональная система развития",
    description:
      "NOVA превращает данные о твоём теле и привычках в конкретные действия.",
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="nova-landing relative w-full overflow-x-clip">{children}</div>
  );
}
