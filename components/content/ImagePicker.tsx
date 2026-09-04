"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BlobImage } from "@/components/ui/BlobImage";
import { db } from "@/lib/db";

export function ImagePicker({ open, multiple = false, selectedIds = [], onSelect, onClose }: {
  open: boolean;
  multiple?: boolean;
  selectedIds?: string[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
}) {
  const images = useLiveQuery(() => db.images.orderBy("createdAt").reverse().toArray(), [], []);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<string[]>(selectedIds);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => { setSelection(selectedIds); searchRef.current?.focus(); }, 0);
    return () => { window.clearTimeout(timer); previous?.focus(); };
  }, [open, selectedIds]);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex='-1'])") ?? [])];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, open]);
  const filtered = useMemo(() => images.filter((image) => `${image.title} ${image.altText} ${image.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [images, query]);
  if (!open) return null;

  const choose = (id: string) => {
    if (!multiple) { onSelect([id]); onClose(); return; }
    setSelection((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <div className="image-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section ref={dialogRef} className="image-picker" role="dialog" aria-modal="true" aria-labelledby="image-picker-title">
        <header><div><span>Asset Library</span><h2 id="image-picker-title">从图片库选择</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="关闭图片选择器"><X aria-hidden="true" size={20} /></button></header>
        <label className="image-picker-search"><Search aria-hidden="true" size={17} /><span className="sr-only">搜索图片</span><input ref={searchRef} type="search" placeholder="按名称、Alt 文本或标签筛选…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="image-picker-grid">
          {filtered.map((image) => <button key={image.id} type="button" data-selected={selection.includes(image.id)} onClick={() => choose(image.id)}><BlobImage blob={image.thumbnail ?? image.blob} alt={image.altText || image.title} width={image.width || 320} height={image.height || 240} /><span>{image.title}</span>{selection.includes(image.id) ? <i><Check aria-hidden="true" size={15} /></i> : null}</button>)}
          {!filtered.length ? <p>没有匹配的图片，可先前往图片资源库导入。</p> : null}
        </div>
        {multiple ? <footer><span>已选择 {selection.length} 张</span><button type="button" onClick={() => { onSelect(selection); onClose(); }}>加入内容</button></footer> : null}
      </section>
    </div>
  );
}
