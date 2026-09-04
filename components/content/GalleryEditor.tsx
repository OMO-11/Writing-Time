"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { GripVertical, ImagePlus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ImagePicker } from "@/components/content/ImagePicker";
import { BlobImage } from "@/components/ui/BlobImage";
import { db } from "@/lib/db";
import type { ContentItem, GalleryLayout } from "@/types/content";

export function GalleryEditor({ content, onChange }: { content: ContentItem<"gallery">; onChange: (next: ContentItem<"gallery">) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const images = useLiveQuery(() => db.images.bulkGet(content.payload.imageIds), [content.payload.imageIds.join("|")], []);
  const imageMap = useMemo(() => new Map(images.filter(Boolean).map((image) => [image!.id, image!])), [images]);
  const updateImages = (imageIds: string[]) => onChange({ ...content, payload: { ...content.payload, imageIds } });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= content.payload.imageIds.length) return;
    const next = [...content.payload.imageIds];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateImages(next);
  };

  return (
    <section className="typed-editor gallery-content-editor">
      <header><div><span>Gallery Composer</span><h2>图片集编排</h2></div><div className="segmented-control" aria-label="图片集布局">{(["grid", "masonry", "slideshow"] as GalleryLayout[]).map((layout) => <button key={layout} type="button" aria-pressed={content.payload.layout === layout} onClick={() => onChange({ ...content, payload: { ...content.payload, layout } })}>{layout === "grid" ? "网格" : layout === "masonry" ? "瀑布流" : "幻灯片"}</button>)}</div><button className="primary-paper-button" type="button" onClick={() => setPickerOpen(true)}><ImagePlus aria-hidden="true" size={17} />添加图片</button></header>
      <div className="gallery-sort-list" data-layout={content.payload.layout}>
        {content.payload.imageIds.map((id, index) => {
          const image = imageMap.get(id);
          if (!image) return null;
          return <article key={id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); move(Number(event.dataTransfer.getData("text/plain")), index); }}>
            <div className="gallery-sort-image"><BlobImage blob={image.thumbnail ?? image.blob} alt={image.altText || image.title} width={image.width || 500} height={image.height || 360} /></div>
            <div><span className="drag-label"><GripVertical aria-hidden="true" size={16} />第 {index + 1} 张</span><strong>{image.title}</strong><input aria-label={`${image.title} 的图片说明`} value={content.payload.captions[id] ?? image.caption ?? ""} placeholder="图片说明" onChange={(event) => onChange({ ...content, payload: { ...content.payload, captions: { ...content.payload.captions, [id]: event.target.value } } })} /><div className="item-actions"><button type="button" onClick={() => onChange({ ...content, coverImageId: id })}><Star aria-hidden="true" size={15} fill={content.coverImageId === id ? "currentColor" : "none"} />{content.coverImageId === id ? "当前封面" : "设为封面"}</button><button type="button" onClick={() => move(index, index - 1)} disabled={index === 0}>上移</button><button type="button" onClick={() => move(index, index + 1)} disabled={index === content.payload.imageIds.length - 1}>下移</button><button className="danger-text" type="button" onClick={() => updateImages(content.payload.imageIds.filter((item) => item !== id))}><Trash2 aria-hidden="true" size={15} />移除</button></div></div>
          </article>;
        })}
        {!content.payload.imageIds.length ? <div className="typed-empty"><ImagePlus aria-hidden="true" size={28} /><h3>把一组画面编成故事</h3><p>从统一图片库选择已有资源，之后可以拖动排序并逐张添加说明。</p><button type="button" onClick={() => setPickerOpen(true)}>选择图片</button></div> : null}
      </div>
      <ImagePicker open={pickerOpen} multiple selectedIds={content.payload.imageIds} onClose={() => setPickerOpen(false)} onSelect={updateImages} />
    </section>
  );
}
