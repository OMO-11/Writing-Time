"use client";

import Image from "next/image";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Flower2, ImagePlus, LoaderCircle, Maximize2, MoonStar, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db, importImageFile } from "@/lib/db";
import type { ImageRecord } from "@/types/workshop";
import { useGalleryAtmosphere } from "./useGalleryAtmosphere";

const GALLERY_SETTING_KEY = "archive-gallery-image-ids";

function GalleryImage({ image, thumbnail = false }: { image: ImageRecord; thumbnail?: boolean }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const blob = thumbnail ? image.thumbnail ?? image.blob : image.blob;
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // IndexedDB blob URLs stay local and cannot use the Next.js image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} alt={image.altText || image.title} draggable={false} decoding="async" loading={thumbnail ? "lazy" : "eager"} />;
}

function GalleryLightbox({ images, selected, onSelect, onClose }: {
  images: ImageRecord[];
  selected: ImageRecord;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const index = images.findIndex((image) => image.id === selected.id);
  const navigate = (step: number) => onSelect(images[(index + step + images.length) % images.length].id);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialogRef} className="archive-gallery-lightbox" aria-labelledby="gallery-lightbox-title" onCancel={onClose} onKeyDown={(event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? -1 : 1);
    }
  }}>
    <div className="archive-lightbox-top"><span>拾光画廊 <i>/</i> {String(index + 1).padStart(2, "0")} — {String(images.length).padStart(2, "0")}</span><button type="button" onClick={onClose} aria-label="关闭大图"><X size={22} /></button></div>
    <div className="archive-lightbox-art"><GalleryImage image={selected} /></div>
    <div className="archive-lightbox-bottom">
      <div><h2 id="gallery-lightbox-title">{selected.title}</h2><p>{selected.caption || "把目光停留的瞬间，留在这里。"}</p></div>
      <div className="archive-lightbox-navigation"><button type="button" onClick={() => navigate(-1)} disabled={images.length < 2} aria-label="上一张图片"><ChevronLeft size={22} /></button><button type="button" onClick={() => navigate(1)} disabled={images.length < 2} aria-label="下一张图片"><ChevronRight size={22} /></button></div>
    </div>
  </dialog>;
}

export function ArchiveGallery() {
  const inputRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInFlight = useRef(false);
  const data = useLiveQuery(async () => {
    const [images, membership] = await Promise.all([
      db.images.orderBy("createdAt").toArray(),
      db.settings.get(GALLERY_SETTING_KEY),
    ]);
    return { images, ids: Array.isArray(membership?.value) ? membership.value as string[] : images.map((image) => image.id) };
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const galleryImages = useMemo(() => {
    const imageMap = new Map(data?.images.map((image) => [image.id, image]));
    return (data?.ids ?? []).map((id) => imageMap.get(id)).filter((image): image is ImageRecord => Boolean(image));
  }, [data]);
  const selected = galleryImages.find((image) => image.id === selectedId) ?? galleryImages[0];
  const selectedIndex = selected ? galleryImages.indexOf(selected) : 0;

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);
  const announce = useCallback((message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(""), 4500);
  }, []);

  const { atmosphere, switching, changeAtmosphere } = useGalleryAtmosphere(() => announce("展示偏好未能保存，请重试。"));
  const isNight = atmosphere === "night";

  const importFiles = async (files: FileList | File[]) => {
    if (!data || importInFlight.current) return;
    const candidates = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!candidates.length) return announce("请选择图片文件。");
    importInFlight.current = true;
    setImporting(true);
    const imported: ImageRecord[] = [];
    let failed = 0;
    try {
      for (const file of candidates) {
        try { imported.push(await importImageFile(file)); }
        catch { failed += 1; }
      }
      if (imported.length) {
        await db.transaction("rw", db.settings, async () => {
          const latest = await db.settings.get(GALLERY_SETTING_KEY);
          const ids = Array.isArray(latest?.value) ? latest.value as string[] : data.ids;
          await db.settings.put({ key: GALLERY_SETTING_KEY, value: [...new Set([...ids, ...imported.map((image) => image.id)])] });
        });
        setSelectedId(imported[0].id);
      }
      announce(failed ? `已收藏 ${imported.length} 张图片，${failed} 张导入失败，请重试。` : `已收藏 ${imported.length} 张图片，让新的故事留在这里。`);
    } catch {
      announce("图片已导入素材库，但未能加入画廊，请稍后重试。");
    } finally {
      setImporting(false);
      importInFlight.current = false;
    }
  };

  const removeSelected = async () => {
    if (!selected || !data) return;
    try {
      await db.transaction("rw", db.settings, async () => {
        const latest = await db.settings.get(GALLERY_SETTING_KEY);
        const ids = Array.isArray(latest?.value) ? latest.value as string[] : data.ids;
        await db.settings.put({ key: GALLERY_SETTING_KEY, value: ids.filter((id) => id !== selected.id) });
      });
      setSelectedId(null);
      setLightboxOpen(false);
      announce(`已将「${selected.title}」移出画廊，原图仍保留在素材库。`);
    } catch { announce("暂时无法移出这张图片，请重试。"); }
  };

  return (
    <main className="archive-gallery-shell" data-atmosphere={atmosphere}>
      <div className="archive-gallery-wrap">
        <header className="archive-gallery-toolbar">
          <Link href="/" className="archive-gallery-back" aria-label="返回地图"><ArrowLeft size={16} /><span>WRITING TIME<small>返回地图</small></span></Link>
          <div className="archive-atmosphere" role="group" aria-label="画廊氛围" aria-busy={switching}>
            <button type="button" aria-pressed={!isNight} aria-disabled={switching} onClick={(event) => void changeAtmosphere("morning", event)}><Flower2 size={16} />晨光<span>诺瓦尔</span></button>
            <button type="button" aria-pressed={isNight} aria-disabled={switching} onClick={(event) => void changeAtmosphere("night", event)}><MoonStar size={16} />星夜<span>伊登</span></button>
          </div>
        </header>

        <section className="archive-gallery-hero" aria-labelledby="archive-gallery-title">
          <div className="archive-hero-copy">
            <div className="archive-hero-eyebrow"><Image src="/assets/gallery/companions-seal.svg" alt="" width={48} height={48} /><span>A LITTLE LIGHT, KEPT FOREVER</span></div>
            <h1 id="archive-gallery-title">拾光<span>画廊</span><i aria-hidden="true">.</i></h1>
            <p>把沿途的光，收进画框。</p>
            <div className="archive-hero-signature"><span aria-hidden="true" /><small>晨花记下相遇 · 星夜妥善珍藏</small></div>
          </div>
          <div className="archive-hero-portrait">
            <Image className="archive-portrait-arch" src="/assets/gallery/celestial-arch.svg" alt="" width={380} height={340} />
            {(["morning", "night"] as const).map((theme) => {
              const portrait = `/assets/gallery/${theme === "night" ? "eden" : "noval"}-gallery-portrait.png`;
              return <div key={theme} className="archive-portrait-figure" data-portrait={theme} data-active={atmosphere === theme} aria-hidden={atmosphere !== theme}>
                <Image className="archive-portrait-bleed" src={portrait} alt="" aria-hidden="true" width={1024} height={1024} sizes="(max-width: 600px) 150px, 290px" draggable={false} loading="eager" />
                <Image className="archive-portrait-character" src={portrait} alt={theme === "night" ? "伊登将画片轻轻收进相册，珍藏旅途中的片刻" : "诺瓦尔展示手中的风景画片，温柔地看向观众"} width={1024} height={1024} sizes="(max-width: 600px) 150px, 290px" draggable={false} priority />
              </div>;
            })}
            <div className="archive-portrait-name"><span>{isNight ? "EDEN" : "NOVAL"}</span><small>{isNight ? "星夜的珍藏者" : "晨光的记录者"}</small></div>
          </div>
        </section>

        <section className="archive-collection" aria-labelledby="archive-collection-title">
          <div className="archive-collection-toolbar">
            <div className="archive-collection-title"><Flower2 size={19} strokeWidth={1.2} /><h2 id="archive-collection-title">沿途拾光</h2><span className="archive-count">{String(galleryImages.length).padStart(2, "0")} 张珍藏</span></div>
            <button className="archive-primary-button" type="button" onClick={() => inputRef.current?.click()} disabled={importing || !data}>{importing ? <LoaderCircle className="archive-spinner" size={17} /> : <ImagePlus size={17} />}{importing ? "正在收藏…" : "收藏图片"}</button>
          </div>

          {data && galleryImages.length ? (
            <div className="archive-gallery-layout">
              <div className="archive-gallery-grid" aria-label="画廊图片">
                {galleryImages.map((image, index) => (
                  <button key={image.id} className="archive-gallery-item" data-selected={selected?.id === image.id} type="button" onClick={() => { setSelectedId(image.id); setLightboxOpen(true); }} aria-label={`查看图片：${image.title}`} aria-haspopup="dialog">
                    <span className="archive-card-image"><GalleryImage image={image} thumbnail /><span className="archive-card-open"><Maximize2 size={18} /></span>{selected?.id === image.id && <span className="archive-card-selected" aria-label="当前图片"><Check size={12} /></span>}</span>
                    <span className="archive-card-caption"><span className="archive-card-number">{String(index + 1).padStart(2, "0")}</span><span className="archive-card-title">{image.title}</span><ArrowRight size={15} /></span>
                  </button>
                ))}
              </div>

              {selected && <aside className="archive-image-inspector" aria-label="当前图片详情">
                <div className="archive-inspector-heading"><MoonStar size={17} /><span>画中一页</span><small>NO. {String(selectedIndex + 1).padStart(2, "0")}</small></div>
                <button className="archive-image-preview" type="button" onClick={() => setLightboxOpen(true)} aria-label={`放大查看：${selected.title}`}><GalleryImage image={selected} thumbnail /></button>
                <h3>{selected.title}</h3>
                <p className="archive-image-caption">{selected.caption || "目光曾在这里停留，故事便有了形状。"}</p>
                <dl className="archive-image-meta"><div><dt>入藏日期</dt><dd>{new Date(selected.createdAt).toLocaleDateString("zh-CN")}</dd></div><div><dt>画面尺寸</dt><dd>{selected.width ?? "—"} × {selected.height ?? "—"}</dd></div></dl>
                {!!selected.tags.length && <div className="archive-image-tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                <div className="archive-image-controls"><button type="button" onClick={() => setLightboxOpen(true)}><Maximize2 size={15} />静静看一会儿<ArrowRight size={15} /></button><button className="archive-remove" type="button" onClick={() => void removeSelected()}><Trash2 size={14} />移出画廊</button></div>
                <p className="archive-remove-hint">移出后，原图仍在素材库中。</p>
              </aside>}
            </div>
          ) : data ? (
            <div className="archive-gallery-empty">
              <div className="archive-empty-frame" aria-hidden="true"><span className="archive-empty-moon"><MoonStar size={35} strokeWidth={.8} /></span><span className="archive-empty-flower"><Flower2 size={29} strokeWidth={1} /></span><Image src="/assets/gallery/crystal-ribbon.svg" alt="" width={40} height={100} /><span className="archive-empty-frame-inner" /></div>
              <span className="archive-empty-eyebrow">THE FIRST PAGE IS YOURS</span>
              <h2>为下一次心动，留一面画墙。</h2>
              <p>也许是一张旅途的照片，也许是刚完成的画。<br />从第一张图片开始，慢慢收藏你的世界。</p>
              <button type="button" className="archive-empty-button" onClick={() => inputRef.current?.click()} disabled={importing}><ImagePlus size={17} />{importing ? "正在收藏…" : "放入第一张图片"}<ArrowRight size={16} /></button>
            </div>
          ) : <div className="archive-gallery-loading" role="status"><LoaderCircle className="archive-spinner" size={22} />正在翻开你的相册……</div>}
        </section>

        <footer className="archive-gallery-footer"><Flower2 size={14} /><span>晨花与星藏</span><i /><span>NOVAL & EDEN</span><MoonStar size={14} /></footer>
      </div>
      <input ref={inputRef} hidden type="file" multiple accept="image/*" aria-label="选择要收藏的图片" onChange={(event) => { if (event.currentTarget.files) void importFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
      <p className="archive-gallery-toast" data-visible={Boolean(notice)} role="status" aria-live="polite">{notice}</p>
      {lightboxOpen && selected && <GalleryLightbox images={galleryImages} selected={selected} onSelect={setSelectedId} onClose={() => setLightboxOpen(false)} />}
    </main>
  );
}
