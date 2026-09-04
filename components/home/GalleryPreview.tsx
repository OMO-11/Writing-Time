import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import { BlobImage } from "@/components/ui/BlobImage";
import type { ImageRecord } from "@/types/workshop";

export function GalleryPreview({
  images,
  imageCount,
  collectionCount,
  onAddImages,
}: {
  images: ImageRecord[];
  imageCount: number;
  collectionCount: number;
  onAddImages: () => void;
}) {
  return (
    <section className="gallery-preview" aria-labelledby="gallery-preview-title">
      <div className="gallery-preview-copy">
        <p className="home-eyebrow">IMAGE ARCHIVE</p>
        <h2 id="gallery-preview-title">图片展览</h2>
        <p>把角色、场景与旅途中收集的色彩，整理成随时可翻阅的视觉档案。</p>
        <dl>
          <div><dt>图片</dt><dd>{imageCount}</dd></div>
          <div><dt>合集</dt><dd>{collectionCount}</dd></div>
        </dl>
        <Link className="text-action" href="/gallery">进入展览 <ArrowRight aria-hidden="true" size={17} /></Link>
      </div>

      {images.length > 0 ? (
        <div className="gallery-preview-grid">
          {[0, 1, 2].map((slot) => {
            const image = images[slot];
            return image ? (
              <Link className={`gallery-preview-image gallery-preview-image-${slot + 1}`} href="/gallery" key={image.id} aria-label={`在画廊查看 ${image.title}`}>
                <BlobImage blob={image.thumbnail ?? image.blob} alt={image.altText || image.title} width={slot === 0 ? 900 : 480} height={slot === 0 ? 760 : 360} className="gallery-thumb" />
              </Link>
            ) : <span className={`gallery-preview-placeholder gallery-preview-image-${slot + 1}`} key={slot} aria-hidden="true"><ImageIcon size={20} /></span>;
          })}
        </div>
      ) : (
        <button className="gallery-preview-empty" type="button" onClick={onAddImages}>
          <ImageIcon aria-hidden="true" size={28} strokeWidth={1.35} />
          <strong>画框还是空的</strong>
          <span>添加 PNG、JPG 或 WebP 图片</span>
        </button>
      )}
    </section>
  );
}
