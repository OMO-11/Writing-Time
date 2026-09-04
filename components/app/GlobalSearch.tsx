"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SearchPopover } from "@/components/search/SearchPopover";
import { SearchService, type GlobalSearchResult } from "@/lib/search-service";

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const focus = () => { inputRef.current?.focus(); setOpen(true); };
    window.addEventListener("fantasy:focus-search", focus);
    return () => window.removeEventListener("fantasy:focus-search", focus);
  }, []);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void SearchService.search(query, {}, 16).then((next) => {
        if (!cancelled) {
          const order = { article: 0, note: 1, record: 2, project: 3, image: 4, gallery: 5, collection: 6, timeline: 7, exhibition: 8, tag: 9 } as const;
          setResults([...next].sort((a, b) => order[a.type] - order[b.type] || b.score - a.score));
          setActiveIndex(0);
          setLoading(false);
        }
      });
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  const openSelection = () => {
    const selected = results[activeIndex];
    if (selected) router.push(selected.href);
    else if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setOpen(false);
  };

  return (
    <div className="global-search" ref={rootRef}>
      <label htmlFor="global-search-input" className="sr-only">搜索作品、图片、合集和标签</label>
      <Search aria-hidden="true" size={18} />
      <input
        ref={inputRef}
        id="global-search-input"
        type="search"
        value={query}
        placeholder="搜索整个工坊…"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="global-search-results"
        onFocus={() => setOpen(true)}
        onChange={(event) => { const value = event.target.value; setQuery(value); setOpen(true); setLoading(Boolean(value.trim())); if (!value.trim()) setResults([]); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.max(0, Math.min(results.length - 1, value + 1))); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); }
          if (event.key === "Enter") { event.preventDefault(); openSelection(); }
          if (event.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
        }}
      />
      {query ? <button type="button" aria-label="清除搜索" onClick={() => { setQuery(""); setResults([]); setLoading(false); inputRef.current?.focus(); }}><X aria-hidden="true" size={16} /></button> : <kbd aria-hidden="true">⌘ K</kbd>}
      {open && query.trim() ? <div id="global-search-results"><SearchPopover query={query} results={results} activeIndex={activeIndex} loading={loading} onActiveChange={setActiveIndex} /></div> : null}
    </div>
  );
}
