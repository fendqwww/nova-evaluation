"use client";

import { motion } from "framer-motion";

export function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const percentage = (current / total) * 100;

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <motion.div
        className="h-full rounded-full bg-accent"
        initial={false}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}
