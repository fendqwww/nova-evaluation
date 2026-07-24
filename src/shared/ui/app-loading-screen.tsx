"use client";

import { motion } from "framer-motion";

export function AppLoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background">
      <motion.span
        className="text-2xl font-semibold tracking-tight text-foreground"
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        Nova
      </motion.span>
    </div>
  );
}
