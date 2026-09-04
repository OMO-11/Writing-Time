"use client";

import { BlobImage } from "@/components/ui/BlobImage";
import type { ImageRecord } from "@/types/workshop";

export function GalleryImage({ image, workTitle, onOpen }: { image: ImageRecord; workTitle?: string; onOpen: () => void }) {
  return (
    <button type="button" className="gallery-item" onClick={onOpen} aria-label={`查看图片：${image.title}`}>
      <BlobImage blob={image.blob} alt={image.altText || image.title} width={image.width || 900} height={image.height || 1200} />
      <span className="gallery-caption">
        <strong>{image.title}</strong>
        {workTitle ? <small>{workTitle}</small> : null}
        <span>{image.tags.map((tag) => <i key={tag}>{tag}</i>)}</span>
      </span>
    </button>
  );
}
