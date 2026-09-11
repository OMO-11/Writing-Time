"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { db, importImageFile } from "@/lib/db";
import type { ImageRecord } from "@/types/workshop";

const GALLERY_SETTING_KEY = "archive-gallery-image-ids";
const VISIBLE_RADIUS = 4;

function wrap(index: number, count: number) {
  return count === 0 ? 0 : ((index % count) + count) % count;
}

function GalleryImage({ image, preview = false }: { image: ImageRecord; preview?: boolean }) {
  const blob = preview ? image.blob : image.thumbnail ?? image.blob;
  const [url, setUrl] = useState("");

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  if (!url) return <div className="archive-image-loading" aria-hidden="true" />;
  return <img src={url} alt={image.altText || image.title} draggable={false} />;
}

export function ArchiveGallery() {
  const inputRef = useRef<HTMLInputElement>(null);
  const allImages = useLiveQuery(() => db.images.orderBy("createdAt").toArray(), [], []);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (initialized) return;
    void db.settings.get(GALLERY_SETTING_KEY).then(async (record) => {
      if (Array.isArray(record?.value)) {
        const existing = new Set(allImages.map((image) => image.id));
        setGalleryIds((record.value as string[]).filter((id) => existing.has(id)));
      } else {
        const initial = allImages.map((image) => image.id);
        setGalleryIds(initial);
        await db.settings.put({ key: GALLERY_SETTING_KEY, value: initial });
      }
      setInitialized(true);
    });
  }, [allImages, initialized]);

  const imageMap = useMemo(() => new Map(allImages.map((image) => [image.id, image])), [allImages]);
  const galleryImages = useMemo(
    () => galleryIds.map((id) => imageMap.get(id)).filter((image): image is ImageRecord => Boolean(image)),
    [galleryIds, imageMap],
  );

  useEffect(() => {
    if (galleryImages.length === 0) {
      setSelectedIndex(0);
      setLightboxOpen(false);
      return;
    }
    setSelectedIndex((current) => wrap(current, galleryImages.length));
  }, [galleryImages.length]);

  const selected = galleryImages.length ? galleryImages[wrap(selectedIndex, galleryImages.length)] : undefined;

  const persistIds = useCallback(async (ids: string[]) => {
    setGalleryIds(ids);
    await db.settings.put({ key: GALLERY_SETTING_KEY, value: ids });
  }, []);

  const announce = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }, []);

  const move = useCallback((direction: number) => {
    if (!galleryImages.length) return;
    setSelectedIndex((current) => wrap(current + direction, galleryImages.length));
  }, [galleryImages.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1);
      if (event.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const candidates = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!candidates.length) {
      announce("没有找到可导入的图片文件。");
      return;
    }

    setImporting(true);
    try {
      const imported: ImageRecord[] = [];
      for (const file of candidates) imported.push(await importImageFile(file));
      const nextIds = [...galleryIds, ...imported.map((image) => image.id)];
      await persistIds(nextIds);
      setSelectedIndex(Math.max(0, nextIds.length - imported.length));
      announce(`已加入 ${imported.length} 份图片档案。`);
    } catch (error) {
      console.error(error);
      announce("导入失败，请检查图片后重试。");
    } finally {
      setImporting(false);
    }
  }, [announce, galleryIds, persistIds]);

  const removeSelected = useCallback(async () => {
    if (!selected) return;
    const selectedId = selected.id;
    const nextIds = galleryIds.filter((id) => id !== selectedId);
    await persistIds(nextIds);
    setSelectedIndex((current) => nextIds.length ? Math.min(current, nextIds.length - 1) : 0);
    announce(`已将「${selected.title}」移出循环档案阵列。`);
  }, [announce, galleryIds, persistIds, selected]);

  const visibleCells = useMemo(() => {
    if (!galleryImages.length) return [];
    const cells = [];
    for (let offset = -VISIBLE_RADIUS; offset <= VISIBLE_RADIUS; offset += 1) {
      const index = wrap(selectedIndex + offset, galleryImages.length);
      cells.push({ image: galleryImages[index], index, offset });
    }
    return cells;
  }, [galleryImages, selectedIndex]);

  return (
    <main className="archive-gallery-shell">
      <header className="archive-gallery-header">
        <Link href="/" className="archive-back-link"><ArrowLeft size={17} /> 返回总主页</Link>
        <div>
          <span className="archive-system-label">ARCHIVE GALLERY / LOOP ARRAY</span>
          <h1>循环档案画廊</h1>
        </div>
        <button className="archive-add-button" type="button" onClick={() => inputRef.current?.click()} disabled={importing}>
          <ImagePlus size={18} /> {importing ? "正在导入" : "新增档案"}
        </button>
      </header>

      <section className="archive-gallery-workspace">
        <div className="archive-array-panel">
          <div className="archive-array-heading">
            <div><span>循环档案阵列</span><strong>{galleryImages.length.toString().padStart(2, "0")} ARCHIVES</strong></div>
            <p>循环索引 · 点击任意档案切换预览 · 方向键连续浏览</p>
          </div>

          {galleryImages.length ? (
            <div className="archive-array-stage">
              <button className="archive-cycle-button archive-cycle-prev" type="button" onClick={() => move(-1)} aria-label="上一份档案"><ChevronLeft /></button>
              <div className="archive-card-track" role="listbox" aria-label="图片档案">
                {visibleCells.map(({ image, index, offset }) => {
                  const distance = Math.abs(offset);
                  const style = {
                    "--archive-offset": offset,
                    "--archive-distance": distance,
                    "--archive-scale": Math.max(.72, 1 - distance * .06),
                    "--archive-opacity": Math.max(.38, 1 - distance * .13),
                    "--archive-z": 30 - distance,
                  } as CSSProperties;
                  return (
                    <button
                      key={`${image.id}-${offset}`}
                      className="archive-card"
                      type="button"
                      data-active={offset === 0}
                      style={style}
                      onClick={() => setSelectedIndex(index)}
                      role="option"
                      aria-selected={offset === 0}
                    >
                      <div className="archive-card-frame"><GalleryImage image={image} /></div>
                      <div className="archive-card-meta">
                        <span>{String(index + 1).padStart(3, "0")}</span>
                        <strong>{image.title}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button className="archive-cycle-button archive-cycle-next" type="button" onClick={() => move(1)} aria-label="下一份档案"><ChevronRight /></button>
            </div>
          ) : (
            <div className="archive-empty-state">
              <ImagePlus size={34} strokeWidth={1.35} />
              <h2>阵列中还没有档案</h2>
              <p>添加图片后，它们会自动进入可循环浏览的档案阵列。</p>
              <button type="button" onClick={() => inputRef.current?.click()}>选择图片</button>
            </div>
          )}
        </div>

        <aside className="archive-preview-panel">
          {selected ? (
            <>
              <div className="archive-preview-topline"><span>SELECTED ARCHIVE</span><b>{String(wrap(selectedIndex, galleryImages.length) + 1).padStart(3, "0")}</b></div>
              <button className="archive-preview-image" type="button" onClick={() => setLightboxOpen(true)} aria-label="打开大图浏览">
                <GalleryImage image={selected} preview />
              </button>
              <div className="archive-preview-info">
                <h2>{selected.title}</h2>
                <p>{selected.width && selected.height ? `${selected.width} × ${selected.height}` : "尺寸未知"} · {selected.mimeType || "IMAGE"}</p>
                <span>点击图片进入全屏浏览</span>
              </div>
              <div className="archive-preview-actions">
                <button type="button" onClick={() => setLightboxOpen(true)}>浏览大图</button>
                <button className="archive-danger-button" type="button" onClick={() => void removeSelected()}><Trash2 size={16} /> 移出阵列</button>
              </div>
            </>
          ) : (
            <div className="archive-preview-placeholder"><span>NO ARCHIVE SELECTED</span></div>
          )}
        </aside>
      </section>

      <input
        ref={inputRef}
        className="archive-file-input"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
        onChange={(event) => {
          if (event.currentTarget.files) void importFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <p className="archive-toast" data-visible={Boolean(notice)} role="status" aria-live="polite">{notice}</p>

      {lightboxOpen && selected ? (
        <div className="archive-lightbox" role="dialog" aria-modal="true" aria-label={`${selected.title} 图片浏览`}>
          <button className="archive-lightbox-close" type="button" onClick={() => setLightboxOpen(false)} aria-label="关闭"><X /></button>
          <button className="archive-lightbox-nav archive-lightbox-prev" type="button" onClick={() => move(-1)} aria-label="上一张"><ChevronLeft /></button>
          <div className="archive-lightbox-image"><GalleryImage image={selected} preview /></div>
          <button className="archive-lightbox-nav archive-lightbox-next" type="button" onClick={() => move(1)} aria-label="下一张"><ChevronRight /></button>
          <div className="archive-lightbox-caption"><strong>{selected.title}</strong><span>{wrap(selectedIndex, galleryImages.length) + 1} / {galleryImages.length}</span></div>
        </div>
      ) : null}
    </main>
  );
}
