"use client";

import { FileText, Images } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function ImportDropOverlay({ visible }: { visible: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="home-drop-overlay"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 5 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <span><FileText aria-hidden="true" size={27} /><Images aria-hidden="true" size={27} /></span>
            <strong>把手稿与插画放进工坊</strong>
            <small>支持 .md、.png、.jpg、.jpeg 与 .webp</small>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
