"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ImagePlus, Maximize2, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, importImageFile } from "@/lib/db";
import type { ImageRecord } from "@/types/workshop";

const GALLERY_SETTING_KEY = "archive-gallery-image-ids";
const RHINE_RECORDS_KEY = "writing-time-rhine-records";

function GalleryImage({ image }: { image: ImageRecord }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(image.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image.blob]);
  return url ? <img src={url} alt={image.altText || image.title} draggable={false} /> : null;
}

function toRhineRecords(images: ImageRecord[]) {
  const columnCount = Math.max(1, Math.min(5, images.length));
  return images.map((image, index) => ({
    id: `X-${String(index + 1).padStart(3, "0")}`,
    title: image.title,
    en: image.name,
    department: "WRITING TIME / GALLERY",
    category: `GALLERY COLUMN ${String((index % columnCount) + 1).padStart(2, "0")}`,
    date: new Date(image.createdAt).toLocaleDateString("zh-CN"),
    lead: `${image.width ?? "?"} × ${image.height ?? "?"}`,
    clearance: "ARCHIVE IMAGE",
    abstract: image.caption || image.altText || image.title,
    findings: image.tags.length ? image.tags : ["LOCAL IMAGE ARCHIVE"],
    source: image.id,
  }));
}

export function ArchiveGallery() {
  const inputRef = useRef<HTMLInputElement>(null);
  const allImages = useLiveQuery(() => db.images.orderBy("createdAt").toArray(), [], []);
  const [galleryIds, setGalleryIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runtimeRevision, setRuntimeRevision] = useState(0);
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
  const selected = selectedId ? imageMap.get(selectedId) : galleryImages[0];

  useEffect(() => {
    if (!initialized) return;
    localStorage.setItem(RHINE_RECORDS_KEY, JSON.stringify(toRhineRecords(galleryImages)));
    const currentPrefs = (() => {
      try { return JSON.parse(localStorage.getItem("rhine-settings") ?? "{}"); } catch { return {}; }
    })();
    localStorage.setItem("rhine-settings", JSON.stringify({ ...currentPrefs, sound: false, music: false, reduced: true }));
    setRuntimeRevision((value) => value + 1);
  }, [galleryImages, initialized]);

  useEffect(() => {
    if (!galleryImages.some((image) => image.id === selectedId)) setSelectedId(galleryImages[0]?.id ?? null);
  }, [galleryImages, selectedId]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.data?.type !== "writing-time-rhine-selection") return;
      if (typeof event.data.imageId === "string" && imageMap.has(event.data.imageId)) setSelectedId(event.data.imageId);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [imageMap]);

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
      announce(`已加入 ${imported.length} 份档案，RhineLab 阵列将自动重新载入。`);
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
    announce(`已将「${selected.title}」移出档案阵列，原图片仍保留在素材库。`);
  }, [announce, galleryIds, persistIds, selected]);

  return (
    <main className="rhine-gallery-shell">
      <header className="rhine-gallery-toolbar">
        <Link href="/" className="rhine-gallery-back"><ArrowLeft size={17} /> 返回总主页</Link>
        <div className="rhine-gallery-title"><span>WRITING TIME / RHINE ARCHIVE</span><strong>循环档案画廊</strong></div>
        <div className="rhine-gallery-actions">
          <span>{galleryImages.length.toString().padStart(2, "0")} ARCHIVES</span>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={importing}><ImagePlus size={17} />{importing ? "导入中" : "新增档案"}</button>
        </div>
      </header>

      {initialized && galleryImages.length ? (
        <section className="rhine-gallery-layout">
          <div className="rhine-runtime-frame">
            <iframe key={runtimeRevision} src="/rhinelab/index.html?embed=1" title="RhineLabUI 无限档案阵列" allow="fullscreen" />
            <div className="rhine-runtime-credit">Archive engine: RhineLabUI · LBEILC · MIT License</div>
          </div>

          <aside className="rhine-image-inspector">
            {selected ? <>
              <div className="rhine-image-heading"><span>SELECTED IMAGE</span><b>{selected.title}</b></div>
              <button className="rhine-image-preview" type="button" onClick={() => setLightboxOpen(true)}><GalleryImage image={selected} /></button>
              <div className="rhine-image-meta">
                <span>{selected.name}</span>
                <span>{selected.width ?? "?"} × {selected.height ?? "?"} · {selected.mimeType || "IMAGE"}</span>
                <span>{selected.tags.length ? selected.tags.join(" · ") : "无标签"}</span>
              </div>
              <div className="rhine-image-controls">
                <button type="button" onClick={() => setLightboxOpen(true)}><Maximize2 size={16} /> 浏览大图</button>
                <button className="danger" type="button" onClick={() => void removeSelected()}><Trash2 size={16} /> 移出阵列</button>
              </div>
            </> : null}
          </aside>
        </section>
      ) : initialized ? (
        <section className="rhine-gallery-empty">
          <ImagePlus size={38} strokeWidth={1.3} />
          <h2>档案阵列中还没有图片</h2>
          <p>添加图片后，页面会使用原版 RhineLabUI Three.js 档案系统生成可上下、左右无限循环的档案阵列。</p>
          <button type="button" onClick={() => inputRef.current?.click()}>选择图片</button>
        </section>
      ) : <div className="rhine-gallery-loading">正在读取本地档案……</div>}

      <input ref={inputRef} hidden type="file" multiple accept="image/*" onChange={(event) => {
        if (event.currentTarget.files) void importFiles(event.currentTarget.files);
        event.currentTarget.value = "";
      }} />
      <p className="rhine-gallery-toast" data-visible={Boolean(notice)}>{notice}</p>

      {lightboxOpen && selected ? <div className="rhine-gallery-lightbox" role="dialog" aria-modal="true">
        <button type="button" className="rhine-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="关闭"><X /></button>
        <GalleryImage image={selected} />
        <div><strong>{selected.title}</strong><span>{selected.width ?? "?"} × {selected.height ?? "?"}</span></div>
      </div> : null}
    </main>
  );
}
