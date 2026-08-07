"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { FAQ_ITEMS } from "../constants";
import { Eyebrow, Glow, Section } from "./section";
import { Reveal, RevealItem } from "./reveal";

/**
 * FAQ.
 *
 * A hand-rolled accordion rather than <details>: the open panel needs a height
 * transition, and `details` cannot animate from `content-visibility: hidden`.
 * Accessibility is preserved manually — a real <button>, aria-expanded, and the
 * panel wired to its trigger with aria-labelledby.
 */
export function FaqSection() {
  // Single-open. A FAQ where every panel can be open at once turns back into
  // the wall of text the accordion existed to avoid.
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reduced = useReducedMotion();

  return (
    <Section id="faq" className="overflow-hidden">
      <Glow tone="blue" className="bottom-0 -right-48 h-[30rem] w-[30rem] opacity-20" />

      <Reveal className="flex flex-col">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <RevealItem>
              <Eyebrow>FAQ</Eyebrow>
            </RevealItem>
            <RevealItem as="h2" className="nova-h1 mt-6 max-w-[12ch] text-white">
              Частые <span className="nova-gradient-text">вопросы</span>
            </RevealItem>
          </div>

          <RevealItem>
            <ul className="flex flex-col">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openIndex === index;
                const panelId = `faq-panel-${index}`;
                const buttonId = `faq-button-${index}`;

                return (
                  <li key={item.question} className="border-b border-(--nova-hairline)">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        className="group flex w-full items-start justify-between gap-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nova-purple) focus-visible:ring-offset-4 focus-visible:ring-offset-(--nova-bg)"
                      >
                        <span
                          className={`text-[1.0625rem] font-medium tracking-[-0.02em] transition-colors duration-300 ${
                            isOpen ? "text-white" : "text-white/80 group-hover:text-white"
                          }`}
                        >
                          {item.question}
                        </span>
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                            isOpen
                              ? "rotate-45 border-transparent bg-(--nova-purple) text-white"
                              : "border-(--nova-hairline-strong) text-(--nova-text-muted)"
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          initial={reduced ? false : { height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={reduced ? undefined : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="nova-body max-w-[62ch] pr-10 pb-6">{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </RevealItem>
        </div>
      </Reveal>
    </Section>
  );
}
