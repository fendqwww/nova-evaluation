"use client";

import { motion } from "framer-motion";

/**
 * The frame between "nothing" and the app — Telegram launching the webview,
 * the session resolving. Kept to a single glowing wordmark rather than a
 * spinner: a spinner promises a determinate wait, and this one has no fixed
 * length, so breathing light is the more honest signal.
 */
export function AppLoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-20 blur-2xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        />
        <motion.span
          className="text-2xl font-semibold tracking-tight text-foreground"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: [0.37, 0, 0.63, 1] }}
        >
          Nova
        </motion.span>
      </div>
    </div>
  );
}
