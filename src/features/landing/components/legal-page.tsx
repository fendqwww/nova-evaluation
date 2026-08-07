import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NovaMark } from "./nova-mark";
import { LandingFooter } from "./landing-footer";

export interface LegalBlock {
  heading: string;
  paragraphs: ReadonlyArray<string>;
  bullets?: ReadonlyArray<string>;
}

/**
 * Shared chrome for the legal documents.
 *
 * Same palette and typography as the landing so the documents read as part of
 * the product, but narrow-measure and free of ornament — a legal page that
 * glows is a legal page nobody trusts.
 */
export function LegalPage({
  title,
  updatedAt,
  intro,
  blocks,
  children,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  blocks: ReadonlyArray<LegalBlock>;
  children?: ReactNode;
}) {
  return (
    <main className="relative">
      <header className="border-b border-(--nova-hairline)">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/landing"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple)"
          >
            <NovaMark className="h-6 w-6" />
            <span className="text-[0.9375rem] font-semibold tracking-[0.16em] text-white">
              NOVA
            </span>
          </Link>
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 text-[0.8125rem] text-(--nova-text-muted) transition-colors duration-200 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            На главную
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="nova-eyebrow">Документ</p>
        <h1 className="nova-h1 mt-5 text-white">{title}</h1>
        <p className="mt-4 text-[0.8125rem] text-(--nova-text-faint)">
          Последнее обновление: {updatedAt}
        </p>

        <p className="nova-lead mt-8">{intro}</p>

        <hr className="nova-rule my-10" />

        <div className="space-y-10">
          {blocks.map((block, index) => (
            <section key={block.heading}>
              <h2 className="nova-h3 text-white">
                <span className="nova-numeric mr-2.5 text-(--nova-text-faint)">
                  {index + 1}.
                </span>
                {block.heading}
              </h2>
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph} className="nova-body mt-4">
                  {paragraph}
                </p>
              ))}
              {block.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {block.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-(--nova-purple)"
                      />
                      <span className="nova-body">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {children}
      </article>

      <LandingFooter />
    </main>
  );
}
