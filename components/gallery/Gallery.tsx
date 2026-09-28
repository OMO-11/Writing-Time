"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Columns3, Grid3X3, ImagePlus, Link2, Search, SlidersHorizontal, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery/GalleryImage";
import { Lightbox } from "@/components/gallery/Lightbox";
import { CharacterEmptyState } from "@/components/theme/CharacterEmptyState";
import { AppIcon } from "@/components/ui/AppIcon";
import { createContent, ensureUnifiedContentModel } from "@/lib/content-service";
import { db, ensureStarterData, importImageFile } from "@/lib/db";
import type { ContentItem } from "@/types/content";
import type { ImageRecord } from "@/types/workshop";
import { useUIStore } from "@/stores/ui-store";

export function Gallery({ requestedImageId }: { requestedImageId?: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const contents = useLiveQuery(() => db.contents.toArray(), [], []);
  const references = useLiveQuery(() => db.contentReferences.toArray(), [], []);
  const { galleryFiltersOpen, toggleGalleryFilters } = useUIStore();
  const [contentFilter, setContentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [referenceFilter, setReferenceFilter] = useState<"all" | "used" | "unused">("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "masonry">("masonry");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(async (files?: FileList | File[] | null) => {
    if (!files) return;
    for (const file of Array.from(files)) if (["image/png", "image/jpeg", "image/webp"].includes(file.type)) await importImageFile(file);
  }, []);

  useEffect(() => { void ensureStarterData().then(ensureUnifiedContentModel); }, []);
  useEffect(() => { if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("upload") === "1") fileRef.current?.click(); }, []);
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (files.length) { event.preventDefault(); void addFiles(files); }
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [addFiles]);
  const metadata = useMemo(() => [...contents].filter((item): item is ContentItem<"image"> => item.type === "image").sort((a, b) => b.createdAt - a.createdAt), [contents]);
  const tags = useMemo(() => [...new Set(metadata.flatMap((image) => image.tags))].sort(), [metadata]);
  const referenceCounts = useMemo(() => references.reduce((map, reference) => map.set(reference.targetId, (map.get(reference.targetId) ?? 0) + 1), new Map<string, number>()), [references]);
  const candidates = useMemo(() => metadata.filter((image) => {
    const used = (referenceCounts.get(image.id) ?? 0) > 0;
    return (contentFilter === "all" || image.payload.relatedContentIds.includes(contentFilter)) && (tagFilter === "all" || image.tags.includes(tagFilter)) && (referenceFilter === "all" || referenceFilter === "used" && used || referenceFilter === "unused" && !used) && (image.title + " " + image.payload.altText + " " + image.payload.caption).toLowerCase().includes(query.toLowerCase());
  }), [metadata, referenceCounts, contentFilter, tagFilter, referenceFilter, query]);
  const pageCount = Math.max(1, Math.ceil(candidates.length / 48));
  const activePage = Math.min(page, pageCount - 1);
  const assetIds = candidates.slice(activePage * 48, (activePage + 1) * 48).map((image) => image.payload.assetId);
  const filtered = useLiveQuery(async () => (await db.images.bulkGet(assetIds)).filter((image): image is ImageRecord => !!image), [assetIds.join("|")], []);
  const contentNames = useMemo(() => new Map(contents.map((content) => [content.id, content.title])), [contents]);
  const changeIndex = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const openedTarget = useRef<string | null>(null);
  useEffect(() => {
    const id = requestedImageId;
    if (!id || openedTarget.current === id) return;
    const targetIndex = candidates.findIndex((image) => image.id === id);
    if (targetIndex >= 0 && Math.floor(targetIndex / 48) !== activePage) { const frame = requestAnimationFrame(() => setPage(Math.floor(targetIndex / 48))); return () => cancelAnimationFrame(frame); }
    const index = filtered.findIndex((image) => image.id === id);
    if (index >= 0) { const frame = requestAnimationFrame(() => { openedTarget.current = id; setLightboxIndex(index); }); return () => cancelAnimationFrame(frame); }
  }, [filtered, requestedImageId, candidates, activePage]);

  return (
    <div className="gallery-page asset-library" data-character-theme="eden" onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}>
      <div className="gallery-actions">
        <label className="asset-search"><Search aria-hidden="true" size={16} /><span className="sr-only">搜索图片</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、Alt 或说明…" /></label>
        <button type="button" onClick={toggleGalleryFilters} aria-expanded={galleryFiltersOpen}><AppIcon icon={galleryFiltersOpen ? X : SlidersHorizontal} /><span>{galleryFiltersOpen ? "收起筛选" : "筛选图片"}</span></button>
        <div className="asset-view-switch" aria-label="图片视图"><button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid3X3 aria-hidden="true" size={16} /><span className="sr-only">网格视图</span></button><button type="button" aria-pressed={view === "masonry"} onClick={() => setView("masonry")}><Columns3 aria-hidden="true" size={16} /><span className="sr-only">瀑布流视图</span></button></div>
        <button className="primary-paper-button" type="button" onClick={() => fileRef.current?.click()}><AppIcon icon={Upload} /><span>批量导入</span></button>
        <input ref={fileRef} className="sr-only" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => { void addFiles(event.target.files); event.currentTarget.value = ""; }} />
      </div>
      <AnimatePresence initial={false}>
        {galleryFiltersOpen ? <motion.div className="gallery-filter-drawer" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : .22 }}>
          <label><span className="field-label">关联内容</span><select className="field-input" value={contentFilter} onChange={(event) => setContentFilter(event.target.value)}><option value="all">全部内容</option>{contents.filter((content) => content.type !== "image").map((content) => <option key={content.id} value={content.id}>{content.title}</option>)}</select></label>
          <label><span className="field-label">标签</span><select className="field-input" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option value="all">全部标签</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></label>
          <label><span className="field-label">引用状态</span><select className="field-input" value={referenceFilter} onChange={(event) => setReferenceFilter(event.target.value as typeof referenceFilter)}><option value="all">全部图片</option><option value="used">已引用</option><option value="unused">未引用</option></select></label>
          <p>{candidates.length} 张图片 · 可直接粘贴剪贴板图片</p>
        </motion.div> : null}
      </AnimatePresence>
      {filtered.length ? <div className={view === "masonry" ? "masonry-gallery" : "asset-grid-gallery"}>{filtered.map((image, index) => <div className="asset-tile" key={image.id}><GalleryImage image={image} workTitle={(image.relatedContentIds ?? []).map((id) => contentNames.get(id)).filter(Boolean).join(" · ") || (image.workId ? contentNames.get(image.workId) : undefined)} onOpen={() => setLightboxIndex(index)} /><footer><span><Link2 aria-hidden="true" size={13} />{referenceCounts.get(image.id) ?? 0}</span><Link href={`/content/${image.id}`}>编辑元数据</Link></footer></div>)}</div> : <div className="gallery-character-empty"><CharacterEmptyState character="eden" variant="gallery" title={metadata.length ? "没有符合筛选条件的图片" : "星夜收藏室还空着"} description={metadata.length ? "试着减少筛选条件，伊登会继续替你整理。" : "上传第一批图片，伊登会把标题、说明、标签与引用关系安静地收好。"} actions={<><button className="primary-paper-button" type="button" onClick={() => fileRef.current?.click()}>上传图片</button><button type="button" onClick={() => void createContent("gallery", "未命名图片集").then((item) => router.push(`/content/${item.id}`))}>创建图片集</button></>} /></div>}
      <nav aria-label="图片分页"><button disabled={activePage === 0} onClick={() => { setLightboxIndex(null); setPage(activePage - 1); }}>上一页</button><span> 第 {activePage + 1} / {pageCount} 页 · 共 {candidates.length} 张 · 每页最多 48 张 </span><button disabled={activePage + 1 >= pageCount} onClick={() => { setLightboxIndex(null); setPage(activePage + 1); }}>下一页</button></nav>
      <Lightbox images={filtered} index={lightboxIndex} onChange={changeIndex} onClose={closeLightbox} />
      {dragging ? <div className="asset-drop-overlay" role="status"><ImagePlus aria-hidden="true" size={30} /><strong>放入图片资源库</strong><span>支持批量 PNG、JPG、JPEG 与 WebP</span></div> : null}
    </div>
  );
}
