"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ImagePlus, Maximize2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, importImageFile } from "@/lib/db";
import type { ImageRecord } from "@/types/workshop";

const GALLERY_SETTING_KEY = "archive-gallery-image-ids";

function GalleryImage({ image }: { image: ImageRecord }) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(image.blob);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [image.blob]);
  return <img ref={imageRef} alt={image.altText || image.title} draggable={false} />;
}

export function ArchiveGallery() {
  const inputRef = useRef<HTMLInputElement>(null);
  const allImages = useLiveQuery(() => db.images.orderBy("createdAt").toArray(), [], []);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (initialized) return;
    void db.settings.get(GALLERY_SETTING_KEY).then(async (record) => {
      const existingIds = new Set(allImages.map((image) => image.id));
      const ids = Array.isArray(record?.value)
        ? (record.value as string[]).filter((id) => existingIds.has(id))
        : allImages.map((image) => image.id);
      setGalleryIds(ids);
      if (!Array.isArray(record?.value)) await db.settings.put({ key: GALLERY_SETTING_KEY, value: ids });
      setInitialized(true);
    });
  }, [allImages, initialized]);

  const imageMap = useMemo(() => new Map(allImages.map((image) => [image.id, image])), [allImages]);
  const galleryImages = useMemo(
    () => galleryIds.map((id) => imageMap.get(id)).filter((image): image is ImageRecord => Boolean(image)),
    [galleryIds, imageMap],
  );
  const selected = galleryImages.find((image) => image.id === selectedId) ?? galleryImages[0];

  const announce = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }, []);

  const persistIds = useCallback(async (ids: string[]) => {
    setGalleryIds(ids);
    await db.settings.put({ key: GALLERY_SETTING_KEY, value: ids });
  }, []);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const candidates = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!candidates.length) return announce("没有找到可导入的图片文件。");
    setImporting(true);
    try {
      const imported: ImageRecord[] = [];
      for (const file of candidates) imported.push(await importImageFile(file));
      await persistIds([...galleryIds, ...imported.map((image) => image.id)]);
      setSelectedId(imported[0]?.id ?? selectedId);
      announce(`已加入 ${imported.length} 张图片。`);
    } catch (error) {
      console.error(error);
      announce("导入失败，请检查图片后重试。");
    } finally {
      setImporting(false);
    }
  }, [announce, galleryIds, persistIds, selectedId]);

  const removeSelected = useCallback(async () => {
    if (!selected) return;
    const next = galleryIds.filter((id) => id !== selected.id);
    await persistIds(next);
    setSelectedId(next[0] ?? null);
    setLightboxOpen(false);
    announce(`已将「${selected.title}」移出画廊，原图片仍保留在素材库。`);
  }, [announce, galleryIds, persistIds, selected]);

  return (
    <main className="archive-gallery-shell">
      <header className="archive-gallery-toolbar">
        <Link href="/" className="archive-gallery-back"><ArrowLeft size={17} /> 返回总主页</Link>
        <div className="archive-gallery-title"><span>WRITING TIME / GALLERY</span><strong>拾光画廊</strong></div>
        <div className="archive-gallery-actions">
          <span>{galleryImages.length.toString().padStart(2, "0")} IMAGES</span>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={importing}><ImagePlus size={17} />{importing ? "导入中" : "新增档案"}</button>
        </div>
      </header>

      {initialized && galleryImages.length ? (
        <section className="archive-gallery-layout">
          <div className="archive-gallery-grid" aria-label="画廊图片">
            {galleryImages.map((image) => (
              <button
                key={image.id}
                className="archive-gallery-item"
                data-selected={selected?.id === image.id}
                type="button"
                onClick={() => setSelectedId(image.id)}
                onDoubleClick={() => { setSelectedId(image.id); setLightboxOpen(true); }}
                aria-label={`选择图片：${image.title}`}
                aria-pressed={selected?.id === image.id}
              >
                <GalleryImage image={image} />
                <span>{image.title}</span>
              </button>
            ))}
          </div>

          <aside className="archive-image-inspector">
            {selected ? <>
              <div className="archive-image-heading"><span>SELECTED IMAGE</span><b>{selected.title}</b></div>
              <button className="archive-image-preview" type="button" onClick={() => setLightboxOpen(true)}><GalleryImage image={selected} /></button>
              <div className="archive-image-meta">
                <span>{selected.name}</span>
                <span>{selected.width ?? "?"} × {selected.height ?? "?"} · {selected.mimeType || "IMAGE"}</span>
                <span>{selected.tags.length ? selected.tags.join(" · ") : "无标签"}</span>
              </div>
              <div className="archive-image-controls">
                <button type="button" onClick={() => setLightboxOpen(true)}><Maximize2 size={16} /> 浏览大图</button>
                <button className="danger" type="button" onClick={() => void removeSelected()}><Trash2 size={16} /> 移出画廊</button>
              </div>
            </> : null}
          </aside>
        </section>
      ) : initialized ? (
        <section className="archive-gallery-empty">
          <ImagePlus size={38} strokeWidth={1.3} />
          <h2>画廊中还没有图片</h2>
          <p>添加图片后，就可以在这里挑选和浏览。</p>
          <button type="button" onClick={() => inputRef.current?.click()}>选择图片</button>
        </section>
      ) : <div className="archive-gallery-loading">正在读取本地图片……</div>}

      <input ref={inputRef} hidden type="file" multiple accept="image/*" onChange={(event) => {
        if (event.currentTarget.files) void importFiles(event.currentTarget.files);
        event.currentTarget.value = "";
      }} />
      <p className="archive-gallery-toast" data-visible={Boolean(notice)}>{notice}</p>

      {lightboxOpen && selected ? <div className="archive-gallery-lightbox" role="dialog" aria-modal="true">
        <button type="button" className="archive-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="关闭"><X /></button>
        <GalleryImage image={selected} />
        <div><strong>{selected.title}</strong><span>{selected.width ?? "?"} × {selected.height ?? "?"}</span></div>
      </div> : null}
    </main>
  );
}
