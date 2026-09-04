"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { BlobImage } from "@/components/ui/BlobImage";
import type { ImageRecord } from "@/types/workshop";

export function Lightbox({ images, index, onChange, onClose }: { images: ImageRecord[]; index: number | null; onChange: (index: number) => void; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const closeButton = useRef<HTMLButtonElement>(null);
  const image = index === null ? undefined : images[index];

  useEffect(() => {
    if (index === null) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onChange((index - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") onChange((index + 1) % images.length);
    };
    document.addEventListener("keydown", keydown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [images.length, index, onChange, onClose]);

  return (
    <AnimatePresence>
      {image && index !== null ? (
        <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label={`图片预览：${image.title}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
          <button ref={closeButton} type="button" className="lightbox-close" onClick={onClose} aria-label="关闭图片预览"><AppIcon icon={X} size={23} /></button>
          <button type="button" className="lightbox-arrow lightbox-prev" onClick={() => onChange((index - 1 + images.length) % images.length)} aria-label="上一张"><AppIcon icon={ChevronLeft} size={27} /></button>
          <motion.figure key={image.id} initial={{ opacity: 0, x: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduceMotion ? 0 : .25 }}>
            <BlobImage key={image.id} blob={image.blob} alt={image.altText || image.title} width={image.width || 1600} height={image.height || 1200} loading="eager" />
            <figcaption><strong>{image.title}</strong><span>{image.tags.join(" · ")}</span></figcaption>
          </motion.figure>
          <button type="button" className="lightbox-arrow lightbox-next" onClick={() => onChange((index + 1) % images.length)} aria-label="下一张"><AppIcon icon={ChevronRight} size={27} /></button>
          <p className="lightbox-count">{index + 1} / {images.length}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
