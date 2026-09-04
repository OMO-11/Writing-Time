"use client";

import { ChevronLeft, ChevronRight, ListTree } from "lucide-react";
import { useMemo, useState } from "react";
import type { HeadingItem } from "@/types/workshop";

export function DocumentOutline({ open, headings, cursorFrom, onToggle, onSelect }: {
  open: boolean;
  headings: HeadingItem[];
  cursorFrom: number;
  onToggle: () => void;
  onSelect: (heading: HeadingItem) => void;
}) {
  const [maxLevel, setMaxLevel] = useState(3);
  const visible = headings.filter((heading) => heading.level <= maxLevel);
  const active = useMemo(() => headings.filter((heading) => heading.from <= cursorFrom).at(-1)?.id, [cursorFrom, headings]);

  return (
    <aside className="document-outline" data-open={open} aria-label="文档大纲">
      <button className="outline-toggle" type="button" onClick={onToggle} aria-expanded={open} aria-label={open ? "收起文档大纲" : "展开文档大纲"}>
        {open ? <ChevronLeft aria-hidden="true" size={17} /> : <ChevronRight aria-hidden="true" size={17} />}
      </button>
      {open ? (
        <div className="outline-panel">
          <header><span><ListTree aria-hidden="true" size={17} /><strong>文档大纲</strong></span><label><span>层级</span><select value={maxLevel} onChange={(event) => setMaxLevel(Number(event.target.value))}><option value="2">H1–H2</option><option value="3">H1–H3</option><option value="4">H1–H4</option><option value="6">全部</option></select></label></header>
          <nav aria-label="Markdown 标题">
            {visible.map((heading) => <button key={`${heading.id}-${heading.from}`} type="button" data-level={heading.level} data-active={active === heading.id} onClick={() => onSelect(heading)}><span>{heading.text}</span></button>)}
            {!visible.length && <p>添加 Markdown 标题后，大纲会自动出现。</p>}
          </nav>
        </div>
      ) : null}
    </aside>
  );
}
